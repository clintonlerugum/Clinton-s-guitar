'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminMessagesBadge } from './AdminMessageNotifications'

type IconName = 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'payments' | 'messages' | 'settings' | 'featured' | 'add'
type NavigationItem = { label: string; href: string; icon: IconName }

const productItems: NavigationItem[] = [
  { label: 'All Products', href: '/admin/products', icon: 'products' },
  { label: 'Add New Product', href: '/admin/products/new', icon: 'add' },
  { label: 'Categories', href: '/admin/categories', icon: 'categories' },
  { label: 'Featured Arrangements', href: '/admin/products?featured=true', icon: 'featured' },
]

const orderItems: NavigationItem[] = [
  { label: 'All Orders', href: '/admin/orders', icon: 'orders' },
  { label: 'Pending Orders', href: '/admin/orders?status=PENDING', icon: 'orders' },
  { label: 'Completed Orders', href: '/admin/orders?status=PAID', icon: 'orders' },
  { label: 'Failed Orders', href: '/admin/orders?status=FAILED', icon: 'orders' },
  { label: 'Cancelled Orders', href: '/admin/orders?status=CANCELLED', icon: 'orders' },
]

const settingsItems: NavigationItem[] = [
  { label: 'Settings Centre', href: '/admin/settings', icon: 'settings' },
  { label: 'Store Information', href: '/admin/settings/store', icon: 'settings' },
  { label: 'Payment Settings', href: '/admin/settings/payment', icon: 'payments' },
  { label: 'Order Settings', href: '/admin/settings/orders', icon: 'orders' },
  { label: 'Downloads', href: '/admin/settings/downloads', icon: 'products' },
  { label: 'Customer Notifications', href: '/admin/settings/notifications', icon: 'messages' },
  { label: 'Storefront', href: '/admin/settings/storefront', icon: 'products' },
  { label: 'Admin Account & Security', href: '/admin/settings/security', icon: 'settings' },
  { label: 'General Preferences', href: '/admin/settings/general', icon: 'settings' },
]

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    categories: <><path d="M4 5h7v7H4zM15 5h5v5h-5zM15 14h5v5h-5zM4 16h7" /><circle cx="7.5" cy="18.5" r="2.5" /></>,
    orders: <><path d="M5 4h14v17H5z" /><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" /></>,
    payments: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    messages: <><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1A7 7 0 0 1 7.3 13l-1.8-.3V9.9l1.8-.3a7 7 0 0 1 .7-1.6L6.6 6.6 8 4.2l1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 .7 1.6l1.8.3v2.8l-1.8.3a7 7 0 0 1-.7 1.6Z" /></>,
    featured: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
    add: <><path d="M12 5v14M5 12h14" /></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function isLinkActive(pathname: string, searchParams: URLSearchParams, href: string) {
  const [path, query] = href.split('?')
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
  if (query) {
    const [key, value] = query.split('=')
    return searchParams.get(key) === value
  }
  if (href === '/admin/settings' && pathname !== '/admin/settings') return false
  if (pathname === '/admin/products' && searchParams.has('featured')) return false
  if (pathname === '/admin/orders' && searchParams.has('status')) return false
  if (href === '/admin/products' && pathname === '/admin/products/new') return false
  return true
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem
  active: boolean
  collapsed: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={item.href}
      className={`admin-sidebar-link${active ? ' is-active' : ''}`}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <NavigationIcon name={item.icon} />
      <span>{item.label}</span>
      {item.href === '/admin/messages' && <AdminMessagesBadge />}
    </Link>
  )
}

function NavigationGroup({
  label,
  icon,
  items,
  active,
  collapsed,
  onExpand,
  onNavigate,
  isActive,
}: {
  label: string
  icon: IconName
  items: NavigationItem[]
  active: boolean
  collapsed: boolean
  onExpand: () => void
  onNavigate: () => void
  isActive: (href: string) => boolean
}) {
  const [open, setOpen] = useState(active)

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  return (
    <div className={`admin-nav-group${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`admin-sidebar-link admin-nav-group-toggle${active ? ' is-active' : ''}`}
        aria-expanded={open}
        title={collapsed ? label : undefined}
        onClick={() => {
          if (collapsed) onExpand()
          else setOpen(!open)
        }}
      >
        <NavigationIcon name={icon} />
        <span>{label}</span>
        <span className="admin-nav-group-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="admin-sidebar-subnav">
          {items.map((item) => (
            <SidebarLink
              active={isActive(item.href)}
              collapsed={collapsed}
              item={item}
              key={item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => isLinkActive(pathname, searchParams, href)
  const productGroupActive = pathname.startsWith('/admin/products') || pathname === '/admin/categories'
  const orderGroupActive = pathname.startsWith('/admin/orders')
  const settingsGroupActive = pathname.startsWith('/admin/settings')
  const closeMobile = () => setMobileOpen(false)

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
      {mobileOpen && <button className="admin-sidebar-backdrop" aria-label="Close admin menu" onClick={closeMobile} />}
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
          <SidebarLink
            active={pathname === '/admin'}
            collapsed={collapsed}
            item={{ label: 'Dashboard', href: '/admin', icon: 'dashboard' }}
            onNavigate={closeMobile}
          />
          <NavigationGroup label="Products" icon="products" items={productItems} active={productGroupActive} collapsed={collapsed} onExpand={() => setCollapsed(false)} onNavigate={closeMobile} isActive={isActive} />
          <NavigationGroup label="Orders" icon="orders" items={orderItems} active={orderGroupActive} collapsed={collapsed} onExpand={() => setCollapsed(false)} onNavigate={closeMobile} isActive={isActive} />
          <SidebarLink active={pathname.startsWith('/admin/customers')} collapsed={collapsed} item={{ label: 'Customers', href: '/admin/customers', icon: 'customers' }} onNavigate={closeMobile} />
          <SidebarLink active={pathname.startsWith('/admin/payments')} collapsed={collapsed} item={{ label: 'Payments', href: '/admin/payments', icon: 'payments' }} onNavigate={closeMobile} />
          <SidebarLink active={pathname.startsWith('/admin/messages')} collapsed={collapsed} item={{ label: 'Messages', href: '/admin/messages', icon: 'messages' }} onNavigate={closeMobile} />
          <NavigationGroup label="Settings" icon="settings" items={settingsItems} active={settingsGroupActive} collapsed={collapsed} onExpand={() => setCollapsed(false)} onNavigate={closeMobile} isActive={isActive} />
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
