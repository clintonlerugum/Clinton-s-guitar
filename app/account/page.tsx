import { getTokenFromCookies, verifyToken } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import Link from 'next/link'
import OrderDeleteButton from '../../components/OrderDeleteButton'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data || typeof data.id !== 'string') {
    return <div>Please <Link href="/login">log in</Link> to view your account.</div>
  }

  const customer = await prisma.user.findUnique({
    where: { id: data.id },
    select: { name: true, email: true }
  })
  if (!customer) {
    return <div>Please <Link href="/login">log in</Link> to view your account.</div>
  }

  const orders = await prisma.order.findMany({
    where: { userId: data.id },
    orderBy: { createdAt: 'desc' },
    include: { items: true, payment: true }
  })
  const downloads = await prisma.download.findMany({
    where: {
      userId: data.id,
      product: { OrderItems: { some: { order: { userId: data.id, status: 'PAID' } } } }
    },
    include: { product: true }
  })

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Your Account</h1>
      <div className="mb-6">
        {customer.name && <p>{customer.name}</p>}
        <p>{customer.email}</p>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button type="submit" className="btn btn-ghost">Log Out</button>
        </form>
      </div>
      <h2 className="font-semibold">Orders</h2>
      {orders.length === 0 ? <div className="p-4 bg-gray-900 rounded">No orders yet.</div> : (
        <ul className="space-y-3 mb-6">
          {orders.map(o => (
            <li key={o.id} className="p-3 bg-gray-900 rounded">
              <div className="flex justify-between"><div>Order: {o.id}</div><div>{o.status}</div></div>
              <div className="text-sm">Total: KES {o.total}</div>
              {['PENDING', 'FAILED'].includes(o.status) && (!o.payment || ['PENDING', 'FAILED'].includes(o.payment.status)) && (
                <div className="mt-3">
                  <OrderDeleteButton orderId={o.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-semibold">Downloads</h2>
      {downloads.length === 0 ? <div className="p-4 bg-gray-900 rounded">No downloads available.</div> : (
        <ul className="space-y-3">
          {downloads.map(d => (
            <li key={d.id} className="flex items-center justify-between p-3 bg-gray-900 rounded">
              <div>
                <div className="font-semibold">{d.product.title}</div>
                <div className="text-sm text-gray-400">{d.product.artist}</div>
              </div>
              <a href={`/api/download/${d.productId}`} className="px-3 py-2 bg-accent text-black rounded">Download</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
