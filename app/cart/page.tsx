import { cookies } from 'next/headers'
import { prisma } from '../../lib/prisma'
import Link from 'next/link'
import { parseCartCookie } from '../../lib/cart'
import CartItemControls from '../../components/CartItemControls'

export const dynamic = 'force-dynamic'

export default async function CartPage({ searchParams }: { searchParams?: { error?: string } }) {
  const cart = parseCartCookie(cookies().get('cart')?.value)
  const cartIsInvalid = cart === null
  const validCart = cart ?? []

  const productIds = validCart.map((item) => item.productId)
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds }, published: true, fullPdf: { not: null } } })
    : []
  const items = validCart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)
    return product ? [{ ...item, product }] : []
  })
  const unavailableCount = validCart.length - items.length

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const unsupportedCurrency = items.some((item) => item.product.currency !== 'KES')

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {searchParams?.error === 'phone' && <p className="mb-4 text-red-400">Enter a valid Kenyan M-Pesa phone number.</p>}
      {searchParams?.error === 'empty' && <p className="mb-4 text-red-400">Your cart has no available tabs to purchase.</p>}
      {searchParams?.error === 'invalid' && <p className="mb-4 text-red-400">Your cart data is invalid. Add the tabs again before checkout.</p>}
      {searchParams?.error === 'currency' && <p className="mb-4 text-red-400">M-Pesa checkout currently supports KES orders only.</p>}
      {searchParams?.error && !['phone', 'empty', 'invalid', 'currency'].includes(searchParams.error) && (
        <p className="mb-4 text-red-400">Could not start the M-Pesa payment. Please try again.</p>
      )}
      {cartIsInvalid && searchParams?.error !== 'invalid' && <p className="mb-4 text-red-400">Your cart data is invalid. Add the tabs again before checkout.</p>}
      {unavailableCount > 0 && <p className="mb-4 text-amber-300">Unavailable or unpublished tabs are excluded from this cart.</p>}
      {unsupportedCurrency && <p className="mb-4 text-amber-300">M-Pesa checkout currently supports KES tabs only.</p>}
      {items.length === 0 ? (
        <div className="p-6 bg-gray-900 rounded">Your cart is empty. <Link href="/shop" className="text-accent">Browse tabs</Link></div>
      ) : (
        <div>
          <ul className="space-y-4 mb-6">
            {items.map((it) => (
              <li key={it.productId} className="flex items-center gap-4 bg-gray-900 p-4 rounded">
                <img src={it.product?.coverImage ?? '/placeholders/cover1.jpg'} className="w-24 rounded" />
                <div className="flex-1">
                  <div className="font-semibold">{it.product.title}</div>
                  <div className="text-sm text-gray-400">{it.product.artist}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{it.product.currency} {it.product.price}</div>
                  <CartItemControls productId={it.productId} title={it.product.title} quantity={it.quantity} />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="font-bold text-lg">{unsupportedCurrency ? 'Total unavailable' : `Total: KES ${total}`}</div>
            <form action="/api/checkout" method="post">
              <label className="mb-2 block text-sm text-gray-400">M-Pesa phone number</label>
              <div className="flex gap-2">
                <input name="phone" required placeholder="0712345678" className="form-input w-48" />
                <button type="submit" className="btn btn-primary">Pay with M-Pesa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
