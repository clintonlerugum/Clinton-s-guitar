'use client'

import { useState } from 'react'

export default function AddToCartButton({ productId, redirectToCart = false }: { productId: string; redirectToCart?: boolean }) {
  const [adding, setAdding] = useState(false)

  async function addToCart() {
    setAdding(true)
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      })
      if (!response.ok) throw new Error('Unable to add tab to cart.')
      window.dispatchEvent(new Event('cart:updated'))
      if (redirectToCart) {
        window.location.assign('/cart')
      } else {
        alert('Added to cart')
      }
    } catch {
      alert('Unable to add this tab to your cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      disabled={adding}
      className={redirectToCart ? 'px-4 py-2 btn-ghost rounded' : 'btn btn-primary'}
    >
      {adding ? 'Adding...' : redirectToCart ? 'Buy Now' : 'Add to Cart'}
    </button>
  )
}