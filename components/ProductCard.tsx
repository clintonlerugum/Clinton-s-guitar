"use client"
import Link from 'next/link'
import { useState } from 'react'

export default function ProductCard({ product }: any) {
  const [adding, setAdding] = useState(false)

  async function addToCart() {
    setAdding(true)
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      })
      if (!response.ok) throw new Error('Unable to add tab to cart.')
      window.dispatchEvent(new Event('cart:updated'))
      alert('Added to cart')
    } catch {
      alert('Unable to add this tab to your cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(182,143,64,0.2)]">
      <div className="relative overflow-hidden rounded">
        <img src={product.coverImage ?? '/placeholders/cover1.jpg'} alt={product.title} className="h-[200px] w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">{product.title}</h3>
        <p className="mb-3 text-sm text-gray-400">{product.artist}</p>
        <div className="mb-4 text-xl font-bold text-accent">{product.currency} {product.price}</div>
        <div className="flex gap-2">
          <Link href={`/tabs/${product.slug}`} className="btn btn-ghost flex-1 px-2 py-2 text-center text-sm">View</Link>
          <button onClick={addToCart} disabled={adding} className="btn btn-primary flex-1 px-2 py-2 text-sm">{adding ? 'Adding...' : 'Add to Cart'}</button>
        </div>
      </div>
    </div>
  )
}
