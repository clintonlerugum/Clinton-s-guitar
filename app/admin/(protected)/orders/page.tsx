import { prisma } from '../../../../lib/prisma'
import OrderDeleteButton from '../../../../components/OrderDeleteButton'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, name: true } }, payment: true }
  })

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      {orders.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No orders yet.</div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded bg-gray-900 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold">Order: {order.id}</div>
                  <div className="text-sm text-gray-400">{order.user?.name || order.user?.email || 'Customer account unavailable'}</div>
                  {order.user?.name && <div className="text-sm text-gray-400">{order.user.email}</div>}
                </div>
                <div className="text-right">
                  <div>{order.status}</div>
                  <div className="text-sm text-gray-400">KES {order.total}</div>
                </div>
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
