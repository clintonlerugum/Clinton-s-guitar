"use client"
import Link from 'next/link'
import * as React from 'react'
import { parseCartCookie } from '../lib/cart'

function getCartCount() {
  const cartCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('cart='))

  if (!cartCookie) return 0

  const cart = parseCartCookie(cartCookie.slice('cart='.length))
  return cart?.reduce((total, item) => total + item.quantity, 0) ?? 0
}

export default function Navbar() {
  const [open, setOpen] = React.useState(false)
  const [cartCount, setCartCount] = React.useState(0)

  React.useEffect(() => {
    const updateCartCount = () => setCartCount(getCartCount())
    updateCartCount()

    const handleCartUpdate = () => updateCartCount()
    window.addEventListener('cart:updated', handleCartUpdate)

    return () => {
      window.removeEventListener('cart:updated', handleCartUpdate)
    }
  }, [])

  return (
    <header className="site-nav">
      <div className="container site-nav-inner">
        <Link href="/" className="logo-link" onClick={() => setOpen(false)}>Clinton&apos;s Guitar</Link>

        <nav className="desktop-nav">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/cart" className="cart-link">
            Cart
            <span className="cart-badge" aria-label={`Cart has ${cartCount} item${cartCount === 1 ? '' : 's'}`}>{cartCount}</span>
          </Link>
          <Link href="/account">Account</Link>
        </nav>

        <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <div className="mobile-nav">
          <div className="container">
            <Link href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link href="/shop" onClick={() => setOpen(false)}>Shop</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <Link href="/cart" onClick={() => setOpen(false)}>Cart ({cartCount})</Link>
            <Link href="/account" onClick={() => setOpen(false)}>Account</Link>
          </div>
        </div>
      )}
    </header>
  )
}
