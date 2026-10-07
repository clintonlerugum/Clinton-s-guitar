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
    <>
      <div className="flex items-center justify-end gap-2 text-sm text-gray-400">
        <button
          type="button"
          aria-label={`Decrease quantity of ${title}`}
          disabled={updating || quantity <= 1}
          onClick={() => updateCart('decrease')}
        >-</button>
        <span>Qty: {quantity}</span>
        <button
          type="button"
          aria-label={`Increase quantity of ${title}`}
          disabled={updating}
          onClick={() => updateCart('increase')}
        >+</button>
        <button
          type="button"
          aria-label={`Remove ${title} from cart`}
          disabled={updating}
          onClick={() => updateCart('remove')}
        >Remove</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </>
  )
}
