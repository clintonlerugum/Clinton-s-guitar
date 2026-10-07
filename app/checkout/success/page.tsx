import Link from 'next/link'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccess({ searchParams }: { searchParams?: { orderId?: string } }) {
  const token = getTokenFromCookies()
  const user = verifyToken(token)
  const order = user && typeof user !== 'string' && typeof user.id === 'string' && searchParams?.orderId
    ? await prisma.order.findFirst({ where: { id: searchParams.orderId, userId: user.id } })
    : null
  const isPaid = order?.status === 'PAID'
  const isFailed = order?.status === 'FAILED'

  return (
    <section className="max-w-2xl mx-auto text-center py-12">
      <div className="mb-6">
        {isPaid && <div className="text-6xl mb-4">✓</div>}
        <h1 className="text-3xl font-bold mb-2">
          {isPaid ? 'Purchase Successful!' : isFailed ? 'Payment not completed' : 'Payment not confirmed'}
        </h1>
        <p className="text-gray-400 mb-4">
          {isPaid
            ? 'Your order has been processed and your downloads are now available.'
            : isFailed
              ? 'Your payment was not completed. Return to your cart to try again.'
              : 'We could not confirm a completed payment for this order. Check your account or contact support if you have paid.'}
        </p>
      </div>

      {order && (
        <div className="bg-gray-900 p-6 rounded mb-6">
          <div className="text-sm text-gray-400 mb-2">Order ID</div>
          <div className="font-mono text-lg break-all">{order.id}</div>
          <div className="mt-2 text-sm text-gray-400">Order status: {order.status}</div>
        </div>
      )}

      <div className="space-y-3">
        <Link href="/account" className="block btn btn-primary">
          View Your Downloads
        </Link>
        <Link href="/shop" className="block btn btn-ghost">
          Continue Shopping
        </Link>
      </div>
    </section>
  )
}
