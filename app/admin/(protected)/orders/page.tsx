import { prisma } from '../../../../lib/prisma'
import OrderDeleteButton from '../../../../components/OrderDeleteButton'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
      payment: true,
      items: { include: { product: { select: { title: true, artist: true } } } }
    }
  })

  return (
    <section className="min-w-0">
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No orders yet.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="min-w-0 rounded bg-gray-900 p-3 sm:p-4">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="break-all font-semibold">Order code: {order.id}</div>
                  <div className="break-words text-sm text-gray-400">{order.user?.name || order.user?.email || 'Customer account unavailable'}</div>
                  {order.user?.name && <div className="break-all text-sm text-gray-400">{order.user.email}</div>}
                </div>
                <div className="shrink-0 sm:text-right">
                  <div>{order.status}</div>
                  <div className="text-sm text-gray-400">KES {order.total}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-gray-800 pt-3">
                <h2 className="mb-1 text-sm font-semibold">Tabs in this order</h2>
                {order.items.length === 0 ? (
                  <p className="text-sm text-gray-400">No tab details available.</p>
                ) : (
                  <ul className="space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex flex-wrap justify-between gap-x-3 text-sm">
                        <span className="min-w-0 break-words">{item.product.title} — {item.product.artist}</span>
                        <span className="shrink-0 text-gray-400">Qty {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {['PENDING', 'FAILED'].includes(order.status) && (!order.payment || ['PENDING', 'FAILED'].includes(order.payment.status)) && (
                <div className="mt-3">
                  <OrderDeleteButton orderId={order.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
