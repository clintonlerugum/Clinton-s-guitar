import { prisma } from '../../../../lib/prisma'
import { getStoreSettings } from '../../../../lib/store-settings'
import { formatStoreDate } from '../../../../lib/format-store-date'
import OrderDeleteButton from '../../../../components/OrderDeleteButton'

export const dynamic = 'force-dynamic'

const filters = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Completed', value: 'PAID' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

function paymentReference(payment: { receiptNumber: string | null; checkoutRequestId: string | null }) {
  return payment.receiptNumber || payment.checkoutRequestId || 'Not assigned'
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[] }
}) {
  const settings = await getStoreSettings()
  const requestedStatus = searchParams?.status
  const status = Array.isArray(requestedStatus) ? requestedStatus[0] : requestedStatus
  const activeStatus = filters.some((filter) => filter.value === status) ? status : ''
  const orders = await prisma.order.findMany({
    where: activeStatus ? { status: activeStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
      payment: {
        select: {
          provider: true,
          status: true,
          amount: true,
          phone: true,
          merchantRequestId: true,
          checkoutRequestId: true,
          receiptNumber: true,
          resultCode: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      items: { include: { product: { select: { title: true, artist: true } } } },
    },
  })

  return (
    <section className="admin-management-page">
      <header className="admin-management-heading">
        <div>
          <span className="admin-eyebrow">Store operations</span>
          <h1>Orders Management</h1>
          <p>Review orders, line items and payment verification details.</p>
        </div>
      </header>

      <nav className="admin-filter-tabs" aria-label="Filter orders">
        {filters.map((filter) => {
          const href = filter.value ? `/admin/orders?status=${filter.value}` : '/admin/orders'
          return (
            <a className={activeStatus === filter.value ? 'is-active' : ''} href={href} key={filter.label} aria-current={activeStatus === filter.value ? 'page' : undefined}>
              {filter.label}
            </a>
          )
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="admin-payment-empty">{activeStatus ? `No ${activeStatus.toLowerCase()} orders.` : 'No orders yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li id={`order-${order.id}`} key={order.id} className="min-w-0 rounded-xl border border-white/10 bg-gray-900/80 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-all text-sm font-semibold text-amber-100">Order #{order.id.slice(-8).toUpperCase()}</h2>
                  <p className="mt-1 break-words text-xs text-gray-400">{order.user?.name || order.user?.email || 'Customer account unavailable'}</p>
                  {order.user?.name && <p className="break-all text-xs text-gray-500">{order.user.email}</p>}
                  <p className="mt-1 text-xs text-gray-500">{formatStoreDate(order.createdAt, settings, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <span className={`admin-status-pill admin-status-${order.status.toLowerCase()}`}>{order.status}</span>
                  <p className="mt-2 text-sm font-semibold text-gray-100">{order.currency} {order.total.toLocaleString('en-KE')}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 border-t border-gray-800 pt-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-gray-200">Products purchased</h3>
                  {order.items.length === 0 ? (
                    <p className="text-xs text-gray-400">No tab details available.</p>
                  ) : (
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex flex-wrap justify-between gap-x-3 text-xs text-gray-300">
                          <span className="min-w-0 break-words">{item.product.title} — {item.product.artist}</span>
                          <span className="shrink-0 text-gray-500">Qty {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-gray-200">Payment information</h3>
                  {order.payment ? (
                    <dl className="grid gap-1 text-xs">
                      <div className="flex justify-between gap-2"><dt className="text-gray-500">Provider / status</dt><dd className="text-right text-gray-300">{order.payment.provider} · {order.payment.status}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-gray-500">Phone</dt><dd className="text-right text-gray-300">{order.payment.phone}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-gray-500">Receipt / reference</dt><dd className="max-w-[65%] break-all text-right text-amber-200">{paymentReference(order.payment)}</dd></div>
                      {order.payment.resultCode !== null && <div className="flex justify-between gap-2"><dt className="text-gray-500">Verification result</dt><dd className="text-right text-gray-300">{order.payment.resultCode}</dd></div>}
                    </dl>
                  ) : (
                    <p className="text-xs text-gray-400">No payment record is associated with this order.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-3">
                {['PENDING', 'FAILED'].includes(order.status) && (!order.payment || ['PENDING', 'FAILED'].includes(order.payment.status)) && (
                  <OrderDeleteButton orderId={order.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
