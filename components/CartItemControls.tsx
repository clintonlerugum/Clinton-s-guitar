'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CartItemControls({ productId, title, quantity }: {
  productId: string
  title: string
  quantity: number
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  async function updateCart(action: 'increase' | 'decrease' | 'remove') {
    setUpdating(true)
    setError('')
    try {
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update your cart.')

      window.dispatchEvent(new Event('cart:updated'))
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update your cart.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="cart-item-control-wrap">
      <div className="cart-item-controls">
        <button
          className="quantity-button"
          type="button"
          aria-label={`Decrease quantity of ${title}`}
          disabled={updating || quantity <= 1}
          onClick={() => updateCart('decrease')}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg>
        </button>
        <span className="quantity-value" aria-live="polite">{quantity}</span>
        <button
          className="quantity-button"
          type="button"
          aria-label={`Increase quantity of ${title}`}
          disabled={updating}
          onClick={() => updateCart('increase')}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
        </button>
        <button
          className="cart-remove-button"
          type="button"
          aria-label={`Remove ${title} from cart`}
          disabled={updating}
          onClick={() => updateCart('remove')}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V3.8h4v1.7m-6.5 0 .7 11h7.6l.7-11M8.2 8.5v5.5m3.6-5.5v5.5" /></svg>
          <span className="sr-only">Remove</span>
        </button>
      </div>
      {error && <p role="alert" className="cart-item-error">{error}</p>}
    </div>
  )
}
