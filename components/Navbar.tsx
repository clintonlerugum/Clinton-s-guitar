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
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [cartCount, setCartCount] = React.useState(0)
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark')

  React.useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    try {
      window.localStorage.setItem('clintons-guitar-theme', nextTheme)
    } catch {
      // Keep the switch usable when browser storage is unavailable.
    }
    setTheme(nextTheme)
  }

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
          <div className="account-settings">
            <Link href="/account">Account</Link>
            <button type="button" className="settings-icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Open appearance settings" aria-expanded={settingsOpen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm8.1 4.9a8.4 8.4 0 0 0 0-2.2l1.6-1.2-1.6-2.8-1.9.7a8 8 0 0 0-1.9-1.1L16 4.5h-3.2l-.4 2a8 8 0 0 0-2.1 0l-.9-1.8-2.8 1.6.7 1.9a8 8 0 0 0-1.1 1.9l-2 .3v3.2l2 .4a8 8 0 0 0 1.1 1.9l-.7 1.9 2.8 1.6.9-1.8a8 8 0 0 0 2.1 0l.4 2H16l.3-2a8 8 0 0 0 1.9-1.1l1.9.7 1.6-2.8-1.6-1.2Z" /></svg>
            </button>
            {settingsOpen && (
              <div className="settings-menu">
                <span className="settings-menu-title">Appearance</span>
                <button type="button" className="theme-toggle" onClick={() => { toggleTheme(); setSettingsOpen(false) }}>
                  {theme === 'dark' ? '☀ Switch to bright mode' : '☾ Switch to dark mode'}
                </button>
              </div>
            )}
          </div>
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
            <div className="mobile-account-settings">
              <button type="button" className="settings-icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Open appearance settings" aria-expanded={settingsOpen}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm8.1 4.9a8.4 8.4 0 0 0 0-2.2l1.6-1.2-1.6-2.8-1.9.7a8 8 0 0 0-1.9-1.1L16 4.5h-3.2l-.4 2a8 8 0 0 0-2.1 0l-.9-1.8-2.8 1.6.7 1.9a8 8 0 0 0-1.1 1.9l-2 .3v3.2l2 .4a8 8 0 0 0 1.1 1.9l-.7 1.9 2.8 1.6.9-1.8a8 8 0 0 0 2.1 0l.4 2H16l.3-2a8 8 0 0 0 1.9-1.1l1.9.7 1.6-2.8-1.6-1.2Z" /></svg>
                <span>Settings</span>
              </button>
              {settingsOpen && (
                <div className="settings-menu mobile-settings-menu">
                  <span className="settings-menu-title">Appearance</span>
                  <button type="button" className="theme-toggle" onClick={() => { toggleTheme(); setSettingsOpen(false) }}>
                    {theme === 'dark' ? '☀ Switch to bright mode' : '☾ Switch to dark mode'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
