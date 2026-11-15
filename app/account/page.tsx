import Link from 'next/link'
import { getTokenFromCookies, verifyToken } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import OrderDeleteButton from '../../components/OrderDeleteButton'
import PendingMpesaAutoCheck from '../../components/PendingMpesaAutoCheck'
import { AccountPasswordForm, AccountProfileForm } from '../../components/AccountSettingsForms'
import { getStoreSettings } from '../../lib/store-settings'
import { formatStoreDate } from '../../lib/format-store-date'

export const dynamic = 'force-dynamic'

const accountSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'My Orders' },
  { id: 'downloads', label: 'My Downloads' },
  { id: 'profile', label: 'Profile Settings' },
  { id: 'security', label: 'Security' },
] as const

type AccountSection = (typeof accountSections)[number]['id']

function isAccountSection(value?: string): value is AccountSection {
  return accountSections.some((section) => section.id === value)
}

function SignInPrompt() {
  return (
    <section className="customer-sign-in">
      <div className="customer-sign-in-card">
        <span className="customer-account-eyebrow">Clinton&apos;s Guitar</span>
        <h1>Your account, all in one place</h1>
        <p>Sign in to review your orders and access your purchased arrangements.</p>
        <div className="customer-sign-in-actions">
          <Link href="/login?redirectTo=%2Faccount" className="customer-action-button">Log in</Link>
          <Link href="/register?redirectTo=%2Faccount" className="customer-secondary-button">Create account</Link>
        </div>
      </div>
    </section>
  )
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { section?: string; pendingOrderId?: string; failedOrderId?: string }
}) {
  const auth = verifyToken(getTokenFromCookies())
  if (!auth || typeof auth === 'string' || typeof auth.id !== 'string') {
    return <SignInPrompt />
  }

  const customer = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { name: true, email: true, role: true },
  })
  if (!customer) return <SignInPrompt />

  const requestedSection = searchParams?.section
  const section: AccountSection = isAccountSection(requestedSection)
    ? requestedSection
    : searchParams?.pendingOrderId || searchParams?.failedOrderId
      ? 'orders'
      : 'overview'
  const settings = await getStoreSettings()
  const needsDownloadData = section === 'overview' || section === 'downloads'
  const totalOrders = section === 'overview'
    ? await prisma.order.count({ where: { userId: auth.id } })
    : 0
  const completedOrders = section === 'overview'
    ? await prisma.order.count({ where: { userId: auth.id, status: 'PAID' } })
    : 0

  const paidOrders = needsDownloadData
    ? await prisma.order.findMany({
      where: { userId: auth.id, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        payment: { select: { updatedAt: true } },
        items: {
          select: {
            product: {
              select: { id: true, title: true, artist: true, coverImage: true, fullPdf: true, fullMuseScore: true },
            },
          },
        },
      },
    })
    : []

  type PaidOrder = (typeof paidOrders)[number]
  type PurchasedProduct = PaidOrder['items'][number]['product']

  const purchasedProducts = new Map<string, { product: PurchasedProduct; purchasedAt: Date; paidAt: Date }>()
  for (const order of paidOrders) {
    for (const item of order.items) {
      if (item.product.fullPdf && !purchasedProducts.has(item.product.id)) {
        purchasedProducts.set(item.product.id, {
          product: item.product,
          purchasedAt: order.createdAt,
          paidAt: order.payment?.updatedAt ?? order.createdAt,
        })
      }
    }
  }

  const downloadHistory = needsDownloadData
    ? await prisma.download.findMany({
      where: { userId: auth.id },
      select: { productId: true, attempts: true },
    })
    : []
  const attemptsByProduct = new Map(downloadHistory.map(({ productId, attempts }) => [productId, attempts]))
  const downloads = Array.from(purchasedProducts.values()).filter(({ product, paidAt }) => {
    if (settings.downloadExpiryDays > 0) {
      const expiresAt = paidAt.getTime() + settings.downloadExpiryDays * 24 * 60 * 60 * 1000
      if (Date.now() >= expiresAt) return false
    }

    const attempts = attemptsByProduct.get(product.id) ?? 0
    return settings.allowRedownload
      ? settings.maxDownloadAttempts <= 0 || attempts < settings.maxDownloadAttempts
      : attempts === 0
  })

  const orders = section === 'orders'
    ? await prisma.order.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { title: true, artist: true } },
          },
        },
        payment: { select: { provider: true, status: true, checkoutRequestId: true } },
      },
    })
    : []
  type AccountOrder = (typeof orders)[number]

  const displayName = customer.name?.trim() || customer.email.split('@')[0]
  const initials = displayName.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
  const accountRole = customer.role === 'ADMIN'
    ? 'Administrator'
    : customer.role === 'CUSTOMER'
      ? 'Customer'
      : customer.role.replace(/[_-]+/g, ' ')
  const orderDateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

  const renderOrder = (order: AccountOrder) => {
    const status = order.status === 'PAID'
      ? { label: 'Completed', tone: 'completed' }
      : order.status === 'PENDING'
        ? { label: 'Pending', tone: 'pending' }
        : order.status === 'FAILED'
          ? { label: 'Failed', tone: 'failed' }
          : { label: order.status.replace(/[_-]+/g, ' '), tone: 'other' }
    const isPendingOrder = order.id === searchParams?.pendingOrderId && order.status === 'PENDING'
    const isFailedOrder = order.id === searchParams?.failedOrderId && order.status === 'FAILED'

    return (
      <li className="customer-order-card" id={`order-${order.id}`} key={order.id}>
        <div className="customer-order-summary">
          <div className="customer-order-heading">
            <span className="customer-order-number">Order #{order.id}</span>
            <span className={`customer-order-status customer-order-status--${status.tone}`}>{status.label}</span>
          </div>
          <p className="customer-order-products">
            {order.items.map((item) => `${item.product.title} × ${item.quantity}`).join(', ') || 'No items listed'}
          </p>
          <div className="customer-order-meta">
            <span>{formatStoreDate(order.createdAt, settings, orderDateOptions)}</span>
            <strong>{order.currency} {order.total.toLocaleString('en-KE')}</strong>
          </div>
          <details className="customer-order-detail">
            <summary className="customer-order-view-button">View Order</summary>
            <div className="customer-order-detail-body">
              <ul className="customer-order-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.product.title} <small>by {item.product.artist}</small></span>
                    <span>Qty {item.quantity}</span>
                  </li>
                ))}
              </ul>
              {isPendingOrder && (
                <p className="customer-order-alert customer-order-alert--pending" aria-live="polite">
                  Your M-Pesa order is still pending. This page will update when Safaricom confirms your payment.
                </p>
              )}
              {isFailedOrder && (
                <p className="customer-order-alert customer-order-alert--failed" role="alert">
                  M-Pesa confirmed that this payment did not complete. You can restore the items to your cart and try again.
                </p>
              )}
              {isPendingOrder && order.payment?.provider === 'MPESA' && order.payment.status === 'PENDING' && (
                <PendingMpesaAutoCheck orderId={order.id} canReconcile={Boolean(order.payment.checkoutRequestId)} />
              )}
              {['PENDING', 'FAILED'].includes(order.status) && (!order.payment || ['PENDING', 'FAILED'].includes(order.payment.status)) && (
                <div className="customer-order-actions">
                  {order.status === 'FAILED' && (
                    <form action="/api/cart/restore" method="post">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="customer-secondary-button">Restore items to cart</button>
                    </form>
                  )}
                  <OrderDeleteButton orderId={order.id} />
                </div>
              )}
            </div>
          </details>
        </div>
      </li>
    )
  }

  return (
    <section className="customer-dashboard" aria-label="Customer account">
      <div className="customer-dashboard-layout">
        <aside className="customer-account-sidebar">
          <nav className="customer-account-nav" aria-label="Account navigation">
            {accountSections.map(({ id, label }) => (
              <Link
                aria-current={section === id ? 'page' : undefined}
                className={section === id ? 'customer-account-nav-active' : undefined}
                href={id === 'overview' ? '/account' : `/account?section=${id}`}
                key={id}
              >
                {label}
              </Link>
            ))}
            <form action="/api/auth/logout" method="post">
              <button className="customer-logout-button" type="submit">Log out</button>
            </form>
          </nav>
        </aside>

        <div className="customer-dashboard-content">
          {section === 'overview' && (
            <>
              <header className="customer-welcome" id="overview">
                <span className="customer-welcome-avatar" aria-hidden="true">{initials || 'G'}</span>
                <div className="customer-welcome-copy">
                  <span className="customer-account-eyebrow">Your Clinton&apos;s Guitar account</span>
                  <h1>Welcome back, <span>{displayName}</span>.</h1>
                  <p>{customer.email}</p>
                </div>
              </header>

              <section className="customer-account-stats" aria-label="Account overview">
                <article className="customer-stat-card">
                  <span className="customer-stat-icon" aria-hidden="true">♫</span>
                  <span className="customer-stat-label">Total Orders</span>
                  <strong>{totalOrders}</strong>
                  <small>All your orders</small>
                </article>
                <article className="customer-stat-card">
                  <span className="customer-stat-icon" aria-hidden="true">✓</span>
                  <span className="customer-stat-label">Completed Orders</span>
                  <strong>{completedOrders}</strong>
                  <small>Successfully paid</small>
                </article>
                <article className="customer-stat-card">
                  <span className="customer-stat-icon" aria-hidden="true">↓</span>
                  <span className="customer-stat-label">Available Downloads</span>
                  <strong>{downloads.length}</strong>
                  <small>Purchased arrangements</small>
                </article>
                <article className="customer-stat-card">
                  <span className="customer-stat-icon" aria-hidden="true">♩</span>
                  <span className="customer-stat-label">Account Status</span>
                  <strong className="customer-stat-role">{accountRole}</strong>
                  <small>Account type</small>
                </article>
              </section>
            </>
          )}

          {section === 'orders' && (
            <section className="customer-account-panel" id="my-orders">
              <div className="customer-section-heading">
                <div>
                  <span className="customer-account-eyebrow">Purchase history</span>
                  <h1>My Orders</h1>
                </div>
                <span className="customer-section-count">{orders.length} total</span>
              </div>
              {orders.length === 0 ? (
                <div className="customer-empty-state">
                  <span aria-hidden="true">♫</span>
                  <h2>Your next arrangement is waiting</h2>
                  <p>Your orders will appear here after checkout.</p>
                  <Link href="/shop" className="customer-secondary-button">Explore the shop</Link>
                </div>
              ) : (
                <ul className="customer-order-list">{orders.map(renderOrder)}</ul>
              )}
            </section>
          )}

          {section === 'downloads' && (
            <section className="customer-account-panel customer-downloads-panel" id="my-downloads">
              <div className="customer-section-heading">
                <div>
                  <span className="customer-account-eyebrow">Ready when you are</span>
                  <h1>My Downloads</h1>
                </div>
                <span className="customer-section-count">{downloads.length} available</span>
              </div>
              {downloads.length === 0 ? (
                <div className="customer-empty-state">
                  <span aria-hidden="true">♪</span>
                  <h2>Your library will be here</h2>
                  <p>Paid arrangements with active download access will appear here.</p>
                  <Link href="/shop" className="customer-action-button">Browse guitar tabs</Link>
                </div>
              ) : (
                <div className="customer-download-grid">
                  {downloads.map(({ product, purchasedAt }) => (
                    <article className="customer-download-card card" key={product.id}>
                      <div className="customer-download-preview product-card-preview">
                        <img
                          src={product.coverImage || '/placeholders/cover1.jpg'}
                          alt={`${product.title} by ${product.artist}`}
                          loading="lazy"
                        />
                      </div>
                      <div className="customer-download-info">
                        <h2>{product.title}</h2>
                        <p>{product.artist}</p>
                        <small>Purchased {formatStoreDate(purchasedAt, settings, orderDateOptions)}</small>
                        <a className="customer-download-button" href={`/api/download/${encodeURIComponent(product.id)}`}>
                          Download {product.fullMuseScore ? 'ZIP' : 'PDF'}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === 'profile' && (
            <section className="customer-account-panel" id="profile-settings">
              <div className="customer-section-heading">
                <div>
                  <span className="customer-account-eyebrow">Personal details</span>
                  <h1>Profile Settings</h1>
                </div>
              </div>
              <div className="customer-profile-email">
                <span>Email address</span>
                <strong>{customer.email}</strong>
                <small>Your email is used to sign in and cannot be changed here.</small>
              </div>
              <AccountProfileForm initialName={customer.name ?? ''} />
            </section>
          )}

          {section === 'security' && (
            <section className="customer-account-panel" id="security">
              <div className="customer-section-heading">
                <div>
                  <span className="customer-account-eyebrow">Keep your account safe</span>
                  <h1>Security</h1>
                </div>
              </div>
              <AccountPasswordForm />
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
