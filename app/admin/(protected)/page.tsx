import Link from 'next/link'
import { prisma } from '../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'
import AdminSalesChart from '../../../components/AdminSalesChart'
import { getStoreSettings } from '../../../lib/store-settings'
import { formatStoreDate } from '../../../lib/format-store-date'
import { AdminUnreadMessagesNotice } from '../../../components/AdminMessageNotifications'

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
  const settings = await getStoreSettings()
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const periodStart = new Date(today)
  periodStart.setUTCDate(periodStart.getUTCDate() - 89)
  const tokenData = verifyToken(getTokenFromCookies())
  const adminId = tokenData && typeof tokenData === 'object' && 'id' in tokenData && typeof tokenData.id === 'string'
    ? tokenData.id
    : null
  const admin = adminId
    ? await prisma.user.findUnique({ where: { id: adminId }, select: { name: true } })
    : null
  const welcomeName = admin?.name?.trim() || 'Clinton Lerugum'

  const [
    totalOrders,
    publishedProducts,
    totalCustomers,
    revenueAgg,
    paidOrders,
    recentOrders,
    activityProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: 'PAID', currency: 'KES' } }),
    prisma.order.findMany({
      where: { status: 'PAID', currency: 'KES', createdAt: { gte: periodStart, lt: new Date(today.getTime() + 86400000) } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, payment: { select: { status: true } } },
    }),
    prisma.product.findMany({
      take: 4,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true, published: true },
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
  const activity = [
    ...recentOrders.map((order) => ({
      key: `order-${order.id}`,
      title: `Order #${order.id.slice(-8).toUpperCase()}`,
      detail: `${order.user?.name || order.user?.email || 'Customer account unavailable'} · ${order.payment?.status || order.status}`,
      date: order.updatedAt,
      href: '/admin/orders',
    })),
    ...activityProducts.map((product) => ({
      key: `product-${product.id}`,
      title: product.title,
      detail: `${product.createdAt.getTime() === product.updatedAt.getTime() ? 'Added to catalogue' : 'Product record updated'} · ${product.published ? 'Published' : 'Draft'}`,
      date: product.updatedAt,
      href: `/admin/products/edit/${encodeURIComponent(product.id)}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

  const stats = [
    { label: 'Total orders', value: totalOrders.toLocaleString('en-KE'), note: 'All order statuses', type: 'orders' as const },
    { label: 'Total sales', value: money('KES', revenue), note: 'Paid orders only', type: 'revenue' as const },
    { label: 'Published products', value: publishedProducts.toLocaleString('en-KE'), note: 'Available in the shop', type: 'products' as const },
    { label: 'Total customers', value: totalCustomers.toLocaleString('en-KE'), note: 'Registered accounts', type: 'customers' as const },
  ]

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <span className="admin-eyebrow">Admin workspace</span>
          <h1>Welcome back, {welcomeName}</h1>
          <p>Your Clinton&apos;s Guitar store at a glance.</p>
        </div>
      </header>

      <AdminUnreadMessagesNotice />

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
                      <span>{formatStoreDate(order.createdAt, settings, { day: 'numeric', month: 'short' })}</span>
                      <span className={`admin-status-pill admin-status-${paymentStatus.toLowerCase()}`}>{paymentStatus}</span>
                      <strong>{money(order.currency, order.total)}</strong>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="admin-panel admin-activity-panel" aria-labelledby="admin-activity-title">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-eyebrow">Store updates</span>
              <h2 id="admin-activity-title">Recent activity</h2>
            </div>
            <Link href="/admin/products" className="admin-view-link">Products <span aria-hidden="true">→</span></Link>
          </div>
          {activity.length === 0 ? (
            <p className="admin-empty-note">Store activity will appear here as orders arrive and products are updated.</p>
          ) : (
            <ul className="admin-activity-list">
              {activity.map((item) => (
                <li className="admin-activity-item" key={item.key}>
                  <span className="admin-activity-mark" aria-hidden="true" />
                  <div className="admin-activity-copy">
                    <Link href={item.href}>{item.title}</Link>
                    <span>{item.detail}</span>
                    <time dateTime={item.date.toISOString()}>{formatStoreDate(item.date, settings, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
