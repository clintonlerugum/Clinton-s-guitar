import { getStoreSettings } from '../../lib/store-settings'

export const dynamic = 'force-dynamic'

export default async function Contact() {
  const settings = await getStoreSettings()
  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contact {settings.storeName}</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
          <form action="/api/contact" method="post" className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input name="name" type="text" placeholder="Your name" className="form-input" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" type="email" placeholder="your@email.com" className="form-input" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea name="message" placeholder="Your message" className="form-input h-32" required></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Send Message</button>
          </form>
        </div>

        <div className="mt-8 p-6 bg-gray-900 rounded">
          <h3 className="font-semibold mb-2">Direct Contact</h3>
          <p className="text-gray-300">Email: <a href={`mailto:${settings.storeEmail}`}>{settings.storeEmail}</a></p>
          {settings.supportContact && <p className="mt-2 whitespace-pre-wrap text-gray-300">{settings.supportContact}</p>}
          <p className="text-gray-300 mt-2">Response time: Within 24 hours</p>
        </div>
      </div>
    </section>
  )
}
