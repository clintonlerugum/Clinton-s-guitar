import Link from 'next/link'
import { prisma } from '../../../../../lib/prisma'
import { formatStoreDate } from '../../../../../lib/format-store-date'
import { getStoreSettings } from '../../../../../lib/store-settings'

export const dynamic = 'force-dynamic'

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const settings = await getStoreSettings()
  const customer = await prisma.user.findFirst({
    where: { id: params.id, role: 'CUSTOMER' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          currency: true,
          status: true,
          createdAt: true,
          payment: { select: { status: true, receiptNumber: true, provider: true } },
          items: {
            select: {
              quantity: true,
              product: { select: { title: true, artist: true } },
            },
          },
        },
      },
    },
  })

  if (!customer) {
    return (
      <section className="admin-management-page">
        <p className="admin-payment-empty">Customer not found.</p>
        <Link href="/admin/customers" className="admin-view-link">← Customers</Link>
      </section>
    )
  }

  return (
    <section className="admin-management-page">
      <header className="admin-management-heading">
        <div>
          <Link href="/admin/customers" className="admin-view-link">← Customers</Link>
          <h1 className="mt-3">{customer.name || 'Customer details'}</h1>
          <p>Read-only customer profile and order history.</p>
        </div>
      </header>

      <div className="admin-customer-detail">
        <section className="admin-customer-detail-card">
          <h2>Customer profile</h2>
          <dl>
            <div><dt>Name</dt><dd>{customer.name || 'Name not provided'}</dd></div>
            <div><dt>Email</dt><dd>{customer.email}</dd></div>
            <div><dt>Account status</dt><dd>Registered customer (no separate status flag)</dd></div>
            <div><dt>Joined</dt><dd>{formatStoreDate(customer.createdAt, settings, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
            <div><dt>Total orders</dt><dd>{customer.orders.length}</dd></div>
          </dl>
        </section>

        <section className="admin-customer-detail-card">
          <h2>Order history</h2>
          {customer.orders.length === 0 ? (
            <p className="text-xs text-gray-400">This customer has not placed any orders.</p>
          ) : (
            <ul className="admin-customer-order-list">
              {customer.orders.map((order) => (
                <li key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <a href={`/admin/orders#order-${encodeURIComponent(order.id)}`}>Order #{order.id.slice(-8).toUpperCase()}</a>
                    <span className={`admin-status-pill admin-status-${order.status.toLowerCase()}`}>{order.payment?.status || order.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">{formatStoreDate(order.createdAt, settings, { day: 'numeric', month: 'short', year: 'numeric' })} · {order.currency} {order.total.toLocaleString('en-KE')}</p>
                  <p className="mt-1 break-words text-[10px] text-gray-500">{order.items.map((item) => `${item.product.title} — ${item.product.artist} ×${item.quantity}`).join(', ') || 'No product details available'}</p>
                  {order.payment?.receiptNumber && <p className="mt-1 break-all text-[10px] text-gray-500">{order.payment.provider} receipt: {order.payment.receiptNumber}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
