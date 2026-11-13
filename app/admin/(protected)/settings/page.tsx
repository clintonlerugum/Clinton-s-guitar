import Link from 'next/link'

const cards = [
  ['store', 'Store Information', 'Update store identity, contact details, logo and social links.', 'store'],
  ['orders', 'Order Settings', 'Review supported order handling and payment safeguards.', 'orders'],
  ['notifications', 'Customer Notifications', 'Check email delivery availability and notification controls.', 'notifications'],
  ['storefront', 'Storefront Settings', 'Manage homepage sections, announcements and footer contact details.', 'storefront'],
  ['security', 'Admin Account & Security', 'Update admin email or password and end the current session.', 'security'],
  ['general', 'General Preferences', 'Choose regional display preferences and maintenance mode.', 'general'],
] as const

const icons: Record<string, string> = {
  store: 'M3 10h18M5 10V6l7-3 7 3v4M5 10v10h14V10M9 20v-6h6v6',
  payment: 'M3 5h18v14H3zM3 10h18m-14 5h4',
  orders: 'M5 4h14v17H5zM8 9h8M8 13h8M8 17h5',
  download: 'M12 3v12m-5-5 5 5 5-5M4 20h16',
  notifications: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  storefront: 'M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6',
  security: 'M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6l-7-3Z',
  general: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3m-17-7 2 2m12 12 2 2m0-16-2 2M7 17l-2 2',
}

export default function AdminSettingsPage() {
  return (
    <section className="admin-settings-centre">
      <header className="admin-settings-page-heading">
        <div>
          <span className="admin-eyebrow">Store administration</span>
          <h1>Settings Management Centre</h1>
          <p>Manage supported store settings and review integrations that remain configured securely in the server environment.</p>
        </div>
      </header>
      <div className="admin-settings-card-grid">
        {cards.map(([slug, title, description, icon]) => (
          <Link className="admin-settings-card" href={`/admin/settings/${slug}`} key={slug}>
            <span className="admin-settings-card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icons[icon]} /></svg>
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="admin-settings-card-action">Manage settings <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
    </section>
  )
}
