import Link from 'next/link'
import { prisma } from '../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'
import AdminSalesChart from '../../../components/AdminSalesChart'

export const dynamic = 'force-dynamic'

const money = (currency: string, amount: number) =>
  `${currency} ${new Intl.NumberFormat('en-KE').format(amount)}`

function StatIcon({ type }: { type: 'orders' | 'revenue' | 'products' | 'customers' }) {
  const paths = {
    orders: <><path d="M5 4h14v17H5z" /><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" /></>,
    revenue: <><path d="M12 2v20M17 5.5c-1-1-2.7-1.5-5-1.5-2.8 0-4.5 1.3-4.5 3.2 0 5 9.5 2 9.5 7 0 2.2-2 3.8-5 3.8-2.2 0-4.3-.7-5.5-2" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6v1" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
}

export default async function AdminPage() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const periodStart = new Date(today)
  periodStart.setUTCDate(periodStart.getUTCDate() - 89)
  const tokenData = verifyToken(getTokenFromCookies())
  const adminEmail = tokenData && typeof tokenData === 'object' && 'email' in tokenData && typeof tokenData.email === 'string'
    ? tokenData.email
    : null
  const firstName = adminEmail?.split('@')[0] || 'Admin'

  const [
    totalOrders,
    totalProducts,
    totalCustomers,
    revenueAgg,
    paidOrders,
    recentOrders,
    latestProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: 'PAID', currency: 'KES' } }),
    prisma.order.findMany({
      where: { status: 'PAID', currency: 'KES', createdAt: { gte: periodStart, lt: new Date(today.getTime() + 86400000) } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, payment: { select: { status: true } } },
    }),
    prisma.product.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, artist: true, difficulty: true, price: true, currency: true, coverImage: true, published: true, featured: true },
    }),
  ])

  const salesByDay = new Map<string, number>()
  for (let day = new Date(periodStart); day <= today; day.setUTCDate(day.getUTCDate() + 1)) {
    salesByDay.set(day.toISOString().slice(0, 10), 0)
  }
  for (const order of paidOrders) {
    const key = order.createdAt.toISOString().slice(0, 10)
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + order.total)
  }
  const salesData = Array.from(salesByDay, ([date, amount]) => ({ date, amount }))
  const revenue = revenueAgg._sum.total ?? 0
  const dateLabel = now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const stats = [
    { label: 'Total orders', value: totalOrders.toLocaleString('en-KE'), note: 'All order statuses', type: 'orders' as const },
    { label: 'Total sales', value: money('KES', revenue), note: 'Paid orders only', type: 'revenue' as const },
    { label: 'Total products', value: totalProducts.toLocaleString('en-KE'), note: 'Published and drafts', type: 'products' as const },
    { label: 'Total customers', value: totalCustomers.toLocaleString('en-KE'), note: 'Registered accounts', type: 'customers' as const },
  ]

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <span className="admin-eyebrow">Admin workspace</span>
          <h1>Welcome back, {firstName}</h1>
          <p>Here&apos;s what&apos;s happening with your guitar tab store.</p>
        </div>
        <div className="admin-profile-card">
          <div className="admin-avatar" aria-hidden="true">{firstName.slice(0, 1).toUpperCase()}</div>
          <div className="admin-profile-copy">
            <strong>{adminEmail || 'Administrator'}</strong>
            <span>{dateLabel}</span>
          </div>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="Store statistics">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <div className="admin-stat-top">
              <span>{stat.label}</span>
              <span className="admin-stat-icon"><StatIcon type={stat.type} /></span>
            </div>
            <strong className="admin-stat-value">{stat.value}</strong>
            <span className="admin-stat-note">{stat.note}</span>
          </article>
        ))}
      </section>

      <div className="admin-bento-grid">
        <AdminSalesChart data={salesData} />

        <section className="admin-panel admin-orders-panel" aria-labelledby="admin-orders-title">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Latest activity</span>
              <h2 id="admin-orders-title">Recent orders</h2>
            </div>
            <Link href="/admin/orders" className="admin-view-link">View all <span aria-hidden="true">→</span></Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="admin-empty-note">Orders will appear here when customers place them.</p>
          ) : (
            <ul className="admin-order-list">
              {recentOrders.map((order) => {
                const paymentStatus = order.payment?.status || order.status
                return (
                  <li key={order.id} className="admin-order-row">
                    <div className="admin-order-main">
                      <strong title={order.id}>#{order.id.slice(-8).toUpperCase()}</strong>
                      <span>{order.user?.name || order.user?.email || 'Customer account unavailable'}</span>
                    </div>
                    <div className="admin-order-meta">
                      <span>{order.createdAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                      <span className={`admin-status-pill admin-status-${paymentStatus.toLowerCase()}`}>{paymentStatus}</span>
                      <strong>{money(order.currency, order.total)}</strong>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="admin-panel admin-products-panel" aria-labelledby="admin-products-title">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Your catalog</span>
              <h2 id="admin-products-title">Latest products</h2>
            </div>
            <Link href="/admin/products" className="admin-view-link">Manage products <span aria-hidden="true">→</span></Link>
          </div>
          {latestProducts.length === 0 ? (
            <p className="admin-empty-note">No products yet. Add a tab to start your catalog.</p>
          ) : (
            <div className="admin-product-grid">
              {latestProducts.map((product) => (
                <article className="admin-product-card" key={product.id}>
                  <Link href={`/admin/products/edit/${product.id}`} className="admin-product-image-link" aria-label={`Edit ${product.title}`}>
                    <img src={product.coverImage || '/placeholders/cover1.jpg'} alt="" className="admin-product-image" />
                  </Link>
                  <div className="admin-product-info">
                    <div className="admin-product-title-row">
                      <h3>{product.title}</h3>
                      <span className={`admin-published-dot${product.published ? ' is-published' : ''}`} title={product.published ? 'Published' : 'Draft'} />
                    </div>
                    <p>{product.difficulty || 'Difficulty not set'} · {money(product.currency, product.price)}</p>
                    <Link href={`/admin/products/edit/${product.id}`}>Manage tab <span aria-hidden="true">→</span></Link>
                    <form action="/api/admin/products/action" method="post" className="admin-feature-toggle">
                      <input type="hidden" name="id" value={product.id} />
                      <button type="submit" name="_action" value="feature">
                        {product.featured ? 'Remove from Featured' : 'Add to Featured'}
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel admin-messages-panel" id="recent-messages" aria-labelledby="admin-messages-title">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Inbox</span>
              <h2 id="admin-messages-title">Recent messages</h2>
            </div>
            <span className="admin-inbox-indicator" aria-label="Message inbox not connected"><span /> Not connected</span>
          </div>
          <div className="admin-inbox-empty">
            <span className="admin-inbox-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg>
            </span>
            <p>This project does not currently store contact form messages in an admin inbox.</p>
            <a href="mailto:lerugumclintonguitars@gmail.com">Open contact email <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="admin-panel admin-settings-panel" id="admin-settings" aria-labelledby="admin-settings-title">
          <span className="admin-eyebrow">Workspace</span>
          <h2 id="admin-settings-title">Settings</h2>
          <p>There are no configurable admin settings pages in this project yet. Store and payment configuration remain unchanged.</p>
        </section>
      </div>
    </div>
  )
}
