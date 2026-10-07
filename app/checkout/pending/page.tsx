import Link from 'next/link'
import { prisma } from '../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'

export const dynamic = 'force-dynamic'

export default async function CheckoutPending({ searchParams }: { searchParams?: { orderId?: string; demo?: string; uncertain?: string; reconciled?: string } }) {
  const orderId = searchParams?.orderId
  const user = verifyToken(getTokenFromCookies())
  const order = orderId && user && typeof user !== 'string' && typeof user.id === 'string'
    ? await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, include: { payment: true } })
    : null

  if (!order) {
    return <section className="mx-auto max-w-2xl py-12"><h1 className="text-3xl font-bold">Order not found</h1><Link href="/shop" className="btn btn-primary mt-6">Return to shop</Link></section>
  }

  const demo = searchParams?.demo === '1'
  const isPaid = order.status === 'PAID'
  const isFailed = order.status === 'FAILED'
  return (
    <section className="mx-auto max-w-2xl py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Order {order.id}</p>
      <h1 className="mt-2 text-3xl font-bold text-white">{isPaid ? 'Payment confirmed' : isFailed ? 'Payment failed' : 'Payment pending'}</h1>
      <div className="mt-6 rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-300">
        {isPaid ? (
          <p>Your payment is confirmed. Your downloads are available in your account.</p>
        ) : isFailed ? (
          <p>Your payment was not completed. Return to your cart to try again.</p>
        ) : demo ? (
          <p>Demo mode is enabled, so no M-Pesa request was sent. This order remains pending and no download has been granted.</p>
        ) : searchParams?.reconciled === 'paid' ? (
          <p>M-Pesa confirmed your payment. Your downloads are available in your account.</p>
        ) : searchParams?.reconciled === 'failed' ? (
          <p>M-Pesa confirmed that this payment did not complete. You can restore the items to your cart and try again.</p>
        ) : searchParams?.reconciled === 'pending' ? (
          <p>M-Pesa has not returned a final payment result yet. Your order remains pending; do not create another payment.</p>
        ) : searchParams?.reconciled === 'unverified' ? (
          <p>The M-Pesa response could not be safely matched to this order. Your order remains pending while it is reviewed.</p>
        ) : searchParams?.reconciled === 'unavailable' ? (
          <p>This payment cannot be checked automatically. Your order remains unchanged; contact support before trying another payment.</p>
        ) : searchParams?.uncertain === '1' ? (
          <p>The M-Pesa request may have reached the provider, but its response could not be confirmed. Do not pay again yet. This order remains pending while its status is reconciled.</p>
        ) : (
          <p>Check your phone and approve the M-Pesa prompt. Your downloads will appear in your account only after Safaricom confirms the payment.</p>
        )}
        <p className="mt-4 text-sm text-gray-400">Order status: <strong className="text-accent">{order.status}</strong></p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {isFailed && (
          <form action="/api/cart/restore" method="post">
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn btn-primary">Restore items to cart</button>
          </form>
        )}
        {!demo && !isPaid && !isFailed && order.status === 'PENDING' && order.payment?.status === 'PENDING' && order.payment.checkoutRequestId && (
          <form action="/api/payments/mpesa/reconcile" method="post">
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn btn-primary">Check M-Pesa payment status</button>
          </form>
        )}
        <Link href="/account" className="btn btn-primary">View account</Link>
        <Link href="/shop" className="btn btn-ghost">Continue shopping</Link>
      </div>
    </section>
  )
}
