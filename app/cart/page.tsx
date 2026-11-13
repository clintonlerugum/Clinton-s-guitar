import { cookies } from 'next/headers'
import { prisma } from '../../lib/prisma'
import Link from 'next/link'
import { parseCartCookie } from '../../lib/cart'
import CartItemControls from '../../components/CartItemControls'
import { getStoreSettings } from '../../lib/store-settings'

export const dynamic = 'force-dynamic'

function formatPrice(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString('en-KE')}`
}

export default async function CartPage({ searchParams }: { searchParams?: { error?: string } }) {
  const settings = await getStoreSettings()
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

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const unsupportedCurrency = items.some((item) => item.product.currency !== 'KES')
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <section className="cart-page">
      <header className="cart-page-heading">
        <div>
          <p className="cart-eyebrow">Your selection</p>
          <h1>Your Cart</h1>
          {items.length > 0 && <p className="cart-item-count">{itemCount} {itemCount === 1 ? 'item' : 'items'} ready for your music stand.</p>}
        </div>
      </header>

      {searchParams?.error === 'phone' && <p className="cart-alert cart-alert-error">Enter a valid Kenyan M-Pesa phone number.</p>}
      {searchParams?.error === 'empty' && <p className="cart-alert cart-alert-error">Your cart has no available tabs to purchase.</p>}
      {searchParams?.error === 'invalid' && <p className="cart-alert cart-alert-error">Your cart data is invalid. Add the tabs again before checkout.</p>}
      {searchParams?.error === 'currency' && <p className="cart-alert cart-alert-error">M-Pesa checkout currently supports KES orders only.</p>}
      {searchParams?.error === 'payments-disabled' && <p className="cart-alert cart-alert-error">M-Pesa checkout is currently unavailable. Please contact the store for assistance.</p>}
      {searchParams?.error === 'maintenance' && <p className="cart-alert cart-alert-error">Checkout is temporarily paused while the store is undergoing maintenance.</p>}
      {searchParams?.error && !['phone', 'empty', 'invalid', 'currency', 'payments-disabled', 'maintenance'].includes(searchParams.error) && (
        <p className="cart-alert cart-alert-error">Could not start the M-Pesa payment. Please try again.</p>
      )}
      {cartIsInvalid && searchParams?.error !== 'invalid' && <p className="cart-alert cart-alert-error">Your cart data is invalid. Add the tabs again before checkout.</p>}
      {unavailableCount > 0 && <p className="cart-alert">Unavailable or unpublished tabs are excluded from this cart.</p>}
      {unsupportedCurrency && <p className="cart-alert">M-Pesa checkout currently supports KES tabs only.</p>}

      {items.length === 0 ? (
        <div className="cart-empty-state">
          <div className="cart-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48"><path d="M7 9h5l4.3 22.1a4 4 0 0 0 3.9 3.2h17.1a4 4 0 0 0 3.8-2.8L45 17H13M21 42a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>
          </div>
          <h2>Your cart is waiting for a song</h2>
          <p>Browse the collection and add a guitar tab to get started.</p>
          <Link href="/shop" className="btn btn-primary">Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-column">
            <ul className="cart-items-list">
              {items.map((item) => (
                <li key={item.productId} className="cart-item">
                  <img
                    src={item.product.coverImage ?? '/placeholders/cover1.jpg'}
                    alt={`${item.product.title} cover`}
                    className="cart-item-image"
                  />
                  <div className="cart-item-product">
                    <h2>{item.product.title}</h2>
                    <p className="cart-item-artist">{item.product.artist}</p>
                    <p className="cart-item-difficulty">{item.product.difficulty || 'Difficulty not specified'}</p>
                  </div>
                  <div className="cart-item-price">
                    <span className="cart-field-label">Price</span>
                    <span>{formatPrice(item.product.currency, item.product.price)}</span>
                  </div>
                  <div className="cart-item-quantity">
                    <span className="cart-field-label">Quantity</span>
                    <CartItemControls productId={item.productId} title={item.product.title} quantity={item.quantity} />
                  </div>
                  <div className="cart-item-total">
                    <span className="cart-field-label">Item total</span>
                    <strong>{formatPrice(item.product.currency, item.product.price * item.quantity)}</strong>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/shop" className="cart-continue-link">
              <span aria-hidden="true">←</span> Continue Shopping
            </Link>
          </div>

          <aside className="order-summary">
            <h2>Order Summary</h2>
            <div className="order-summary-row">
              <span>Subtotal</span>
              <span>{unsupportedCurrency ? 'Unavailable' : formatPrice('KES', subtotal)}</span>
            </div>
            <div className="order-summary-row order-summary-total">
              <span>Total</span>
              <strong>{unsupportedCurrency ? 'Unavailable' : formatPrice('KES', subtotal)}</strong>
            </div>
            {unsupportedCurrency && <p className="order-summary-note">M-Pesa checkout currently supports KES orders only.</p>}

            <form action="/api/checkout" method="post" className="checkout-form">
              {settings.paymentInstructions && <p className="order-summary-note">{settings.paymentInstructions}</p>}
              <label htmlFor="cart-checkout-phone">M-Pesa phone number</label>
              <input
                id="cart-checkout-phone"
                name="phone"
                type="tel"
                required
                placeholder="0712345678"
                className="form-input"
              />
              <button type="submit" className="btn btn-primary checkout-button" disabled={!settings.mpesaEnabled || settings.maintenanceMode || unsupportedCurrency}>
                {settings.maintenanceMode ? 'Checkout temporarily paused' : !settings.mpesaEnabled ? 'M-Pesa checkout unavailable' : 'Proceed to Checkout'} {!settings.maintenanceMode && settings.mpesaEnabled && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="checkout-security">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 4 5v4.7c0 3.7 2.6 6.4 6 7.8 3.4-1.4 6-4.1 6-7.8V5l-6-2.5Zm-2.7 7.4 1.8 1.8 3.8-4" /></svg>
              Secure &amp; Safe Checkout
            </p>
          </aside>
        </div>
      )}
    </section>
  )
}
