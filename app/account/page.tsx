import { getTokenFromCookies, verifyToken } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import Link from 'next/link'
import OrderDeleteButton from '../../components/OrderDeleteButton'

export const dynamic = 'force-dynamic'

function SignInPrompt() {
  return (
    <section className="mx-auto max-w-xl">
      <div className="card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold">Your Account</h1>
        <p className="mt-2 text-gray-300">Log in to view your orders and download your purchased tabs.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login?redirectTo=%2Faccount" className="btn btn-primary w-full text-center sm:w-auto">Log In</Link>
          <Link href="/register?redirectTo=%2Faccount" className="btn btn-ghost w-full text-center sm:w-auto">Create Account</Link>
        </div>
      </div>
    </section>
  )
}

export default async function AccountPage() {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data || typeof data.id !== 'string') {
    return <SignInPrompt />
  }

  const customer = await prisma.user.findUnique({
    where: { id: data.id },
    select: { name: true, email: true }
  })
  if (!customer) {
    return <SignInPrompt />
  }

  const orders = await prisma.order.findMany({
    where: { userId: data.id },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: { select: { title: true, artist: true } } } },
      payment: true
    }
  })
  const downloads = await prisma.download.findMany({
    where: {
      userId: data.id,
      product: { OrderItems: { some: { order: { userId: data.id, status: 'PAID' } } } }
    },
    include: { product: true }
  })

  return (
    <section className="min-w-0">
      <h1 className="text-2xl font-bold mb-4">Your Account</h1>
      <div className="mb-6">
        {customer.name && <p>{customer.name}</p>}
        <p className="break-all">{customer.email}</p>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button type="submit" className="btn btn-ghost">Log Out</button>
        </form>
      </div>
      <h2 className="font-semibold">Orders</h2>
      {orders.length === 0 ? <div className="p-4 bg-gray-900 rounded">No orders yet.</div> : (
        <ul className="space-y-3 mb-6">
          {orders.map((order) => (
            <li key={order.id} className="min-w-0 rounded bg-gray-900 p-3 sm:p-4">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="break-all">Order code: {order.id}</div>
                  <div className="mt-1 text-sm text-gray-400">{order.createdAt.toLocaleDateString()}</div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <div>{order.status}</div>
                  <div className="text-sm">Total: KES {order.total}</div>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-gray-800 pt-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-x-3 text-sm">
                    <span className="min-w-0 break-words">{item.product.title} — {item.product.artist}</span>
                    <span className="shrink-0 text-gray-400">Qty {item.quantity}</span>
                  </li>
                ))}
              </ul>
              {['PENDING', 'FAILED'].includes(order.status) && (!order.payment || ['PENDING', 'FAILED'].includes(order.payment.status)) && (
                <div className="mt-3">
                  {order.status === 'PENDING' && order.payment?.provider === 'MPESA' && order.payment.status === 'PENDING' && order.payment.checkoutRequestId && (
                    <form action="/api/payments/mpesa/reconcile" method="post" className="mb-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="btn btn-primary w-full sm:w-auto">Check M-Pesa payment status</button>
                    </form>
                  )}
                  <OrderDeleteButton orderId={order.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-semibold">Downloads</h2>
      {downloads.length === 0 ? <div className="p-4 bg-gray-900 rounded">No downloads available.</div> : (
        <ul className="space-y-3">
          {downloads.map(download => (
            <li key={download.id} className="flex flex-col gap-3 rounded bg-gray-900 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <div className="break-words font-semibold">{download.product.title}</div>
                <div className="break-words text-sm text-gray-400">{download.product.artist}</div>
              </div>
              <a href={'/api/download/' + encodeURIComponent(download.productId)} className="w-full rounded bg-accent px-3 py-2 text-center text-black sm:w-auto">Download</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
