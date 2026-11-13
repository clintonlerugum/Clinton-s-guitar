"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [cartCount, setCartCount] = React.useState(0)
  const [brand, setBrand] = React.useState("Clinton's Guitar")
  const matchesRoute = (route: string) => pathname === route || pathname.startsWith(`${route}/`)
  const activeHref = matchesRoute('/')
    ? '/'
    : matchesRoute('/shop') || pathname.startsWith('/tabs/')
      ? '/shop'
      : matchesRoute('/about')
        ? '/about'
        : matchesRoute('/cart') || pathname.startsWith('/checkout/')
          ? '/cart'
          : ['/account', '/login', '/register'].some(matchesRoute)
            ? '/account'
            : null

  React.useEffect(() => {
    const updateCartCount = () => setCartCount(getCartCount())
    updateCartCount()

    const handleCartUpdate = () => updateCartCount()
    window.addEventListener('cart:updated', handleCartUpdate)

    return () => {
      window.removeEventListener('cart:updated', handleCartUpdate)
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/store/settings')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load public store branding.')
        return response.json()
      })
      .then((settings: { storeName: string }) => {
        setBrand(settings.storeName)
      })
      .catch((error) => console.error(error))
  }, [])

  return (
    <header className="site-nav">
      <div className="container site-nav-inner">
        <Link href="/" className="logo-link" onClick={() => setOpen(false)}>{brand}</Link>

        <nav className="desktop-nav">
          <Link href="/" className={activeHref === '/' ? 'active' : undefined} aria-current={activeHref === '/' ? 'page' : undefined}>Home</Link>
          <Link href="/shop" className={activeHref === '/shop' ? 'active' : undefined} aria-current={activeHref === '/shop' ? 'page' : undefined}>Shop</Link>
          <Link href="/about" className={activeHref === '/about' ? 'active' : undefined} aria-current={activeHref === '/about' ? 'page' : undefined}>About</Link>
          <Link href="/account" className={`nav-icon-link nav-account-link${activeHref === '/account' ? ' active' : ''}`} aria-current={activeHref === '/account' ? 'page' : undefined}>
            <svg className="nav-account-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" /></svg>
            <span>Account</span>
          </Link>
          <Link
            href="/cart"
            className={`nav-icon-link nav-cart-link${activeHref === '/cart' ? ' active' : ''}`}
            aria-label={`Shopping cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            aria-current={activeHref === '/cart' ? 'page' : undefined}
          >
            <svg className="nav-cart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l2.4 12.1a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.4L22 8H6M10 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>
            <span className="cart-badge" aria-hidden="true">{cartCount}</span>
          </Link>
        </nav>

        <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <div className="mobile-nav">
          <div className="container">
            <Link href="/" className={activeHref === '/' ? 'active' : undefined} aria-current={activeHref === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>Home</Link>
            <Link href="/shop" className={activeHref === '/shop' ? 'active' : undefined} aria-current={activeHref === '/shop' ? 'page' : undefined} onClick={() => setOpen(false)}>Shop</Link>
            <Link href="/about" className={activeHref === '/about' ? 'active' : undefined} aria-current={activeHref === '/about' ? 'page' : undefined} onClick={() => setOpen(false)}>About</Link>
            <Link href="/account" className={`nav-icon-link nav-account-link${activeHref === '/account' ? ' active' : ''}`} aria-current={activeHref === '/account' ? 'page' : undefined} onClick={() => setOpen(false)}>
              <svg className="nav-account-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" /></svg>
              <span>Account</span>
            </Link>
            <Link
              href="/cart"
              className={`nav-icon-link nav-cart-link${activeHref === '/cart' ? ' active' : ''}`}
              aria-label={`Shopping cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
              aria-current={activeHref === '/cart' ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <svg className="nav-cart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l2.4 12.1a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 1.9-1.4L22 8H6M10 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>
              <span className="cart-badge" aria-hidden="true">{cartCount}</span>
              <span>Cart</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
