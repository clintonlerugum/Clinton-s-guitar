import Link from 'next/link'
import { getStoreSettings } from '../../lib/store-settings'
import ContactForm from '../../components/ContactForm'

export const dynamic = 'force-dynamic'

export default async function Contact() {
  const settings = await getStoreSettings()
  return (
    <section className="contact-page">
      <header className="contact-page-heading">
        <span className="contact-eyebrow">We&apos;d love to hear from you</span>
        <h1>Contact {settings.storeName}</h1>
        <p>Have a question about an arrangement or your order? Send a note and it will arrive in our message inbox.</p>
      </header>

      <div className="contact-page-grid">
        <div className="contact-form-card" id="contact-form">
          <div className="contact-form-heading">
            <h2>Send us a message</h2>
            <p>Share a few details and we&apos;ll be in touch.</p>
          </div>
          <ContactForm />
        </div>

        <aside className="contact-direct-card">
          <span className="contact-direct-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
          </span>
          <span className="contact-eyebrow">Contact details</span>
          <h2>Here to help</h2>
          <p>For enquiries, use the form and your message will be saved to the Clinton&apos;s Guitar inbox.</p>
          <div className="contact-direct-email">
            <span>Email</span>
            <Link href="/contact#contact-form">{settings.storeEmail}</Link>
          </div>
          {settings.supportContact && <p className="contact-support-detail">{settings.supportContact}</p>}
        </aside>
      </div>
    </section>
  )
}
