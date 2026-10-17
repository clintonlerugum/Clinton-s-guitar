import Link from 'next/link'
import { redirect } from 'next/navigation'
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
  if (!demo && order.payment?.provider === 'MPESA') {
    const target = new URLSearchParams()
    target.set(order.status === 'FAILED' ? 'failedOrderId' : 'pendingOrderId', order.id)
    redirect(`/account?${target.toString()}`)
  }
  const isPaid = order.status === 'PAID'
  const isFailed = order.status === 'FAILED'
  return (
    <section className="mx-auto max-w-2xl py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Order {order.id}</p>
      <h1 className="mt-2 text-3xl font-bold text-white">{isPaid ? 'Payment confirmed' : isFailed ? 'Payment failed' : demo ? 'Demo checkout' : 'Waiting for M-Pesa payment'}</h1>
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
          <p>Your payment is still being processed by M-Pesa. This is not a failed payment. Keep this page open and do not start another checkout.</p>
        ) : searchParams?.reconciled === 'unverified' ? (
          <p>M-Pesa has not confirmed the final result yet, so this order remains pending. We’ll keep checking; do not start another checkout.</p>
        ) : searchParams?.reconciled === 'unavailable' ? (
          <p>M-Pesa’s status could not be checked just now. This does not mean your payment failed. Keep this page open and check again below.</p>
        ) : searchParams?.uncertain === '1' ? (
          <p>Your M-Pesa request is awaiting confirmation. It has not been marked as failed. Keep this page open and do not start another checkout.</p>
        ) : (
          <p>The payment request has been sent. Check your phone and enter your M-Pesa PIN. This page will update when M-Pesa confirms the payment.</p>
        )}
        <p className="mt-4 text-sm text-gray-400">Order status: <strong className="text-accent">{isPaid ? 'PAID' : isFailed ? 'FAILED' : 'AWAITING PAYMENT'}</strong></p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {isFailed && (
          <form action="/api/cart/restore" method="post">
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="btn btn-primary">Restore items to cart</button>
          </form>
        )}
        <Link href="/account" className="btn btn-primary">View account</Link>
        <Link href="/shop" className="btn btn-ghost">Continue shopping</Link>
      </div>
    </section>
  )
}
