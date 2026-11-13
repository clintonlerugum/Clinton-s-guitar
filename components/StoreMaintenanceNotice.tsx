import Link from 'next/link'

export default function StoreMaintenanceNotice() {
  return (
    <section className="store-maintenance-notice">
      <span className="home-eyebrow">A brief pause for improvements</span>
      <h1>We&apos;ll be back soon.</h1>
      <p>The store is temporarily unavailable while we make updates. Please check back shortly.</p>
      <Link href="/" className="btn btn-primary">Return home</Link>
    </section>
  )
}
