'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navigationItems = [
  { label: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'Products', href: '/admin/products', icon: 'products' },
  { label: 'Categories', href: '/admin/categories', icon: 'categories' },
  { label: 'Orders', href: '/admin/orders', icon: 'orders' },
  { label: 'Customers', href: '/admin/customers', icon: 'customers' },
  { label: 'Messages', href: '/admin#recent-messages', icon: 'messages' },
  { label: 'Settings', href: '/admin#admin-settings', icon: 'settings' },
] as const

function NavigationIcon({ name }: { name: (typeof navigationItems)[number]['icon'] }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    categories: <><path d="M4 5h7v7H4zM15 5h5v5h-5zM15 14h5v5h-5zM4 16h7" /><circle cx="7.5" cy="18.5" r="2.5" /></>,
    orders: <><path d="M5 4h14v17H5z" /><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" /></>,
    messages: <><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1A7 7 0 0 1 7.3 13l-1.8-.3V9.9l1.8-.3a7 7 0 0 1 .7-1.6L6.6 6.6 8 4.2l1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 .7 1.6l1.8.3v2.8l-1.8.3a7 7 0 0 1-.7 1.6Z" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function AdminNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <button
        type="button"
        className="admin-mobile-menu"
        aria-expanded={mobileOpen}
        aria-controls="admin-sidebar"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span>
        <span>{mobileOpen ? 'Close menu' : 'Admin menu'}</span>
      </button>
      {mobileOpen && <button className="admin-sidebar-backdrop" aria-label="Close admin menu" onClick={() => setMobileOpen(false)} />}
      <aside
        id="admin-sidebar"
        className={`admin-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}
      >
        <div className="admin-sidebar-brand">
          <Link href="/admin" aria-label="Clinton's Guitar admin dashboard">
            <span className="admin-brand-mark">CG</span>
            <span className="admin-brand-name">Clinton&apos;s Guitar<span>ADMIN STUDIO</span></span>
          </Link>
          <button
            type="button"
            className="admin-collapse-button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav aria-label="Admin navigation" className="admin-sidebar-nav">
          <span className="admin-sidebar-label">Workspace</span>
          {navigationItems.map((item) => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : item.href.startsWith('/admin#')
                ? false
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`admin-sidebar-link${active ? ' is-active' : ''}`}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <form action="/api/auth/logout" method="post" className="admin-logout-form">
          <button className="admin-sidebar-link admin-logout-button" type="submit" title={collapsed ? 'Logout' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
            </svg>
            <span>Logout</span>
          </button>
        </form>
      </aside>
    </>
  )
}
