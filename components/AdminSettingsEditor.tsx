'use client'

import { useState } from 'react'

type SettingsSubmitEvent = { preventDefault(): void; currentTarget: HTMLFormElement }

type Settings = Record<string, string | number | boolean>
type Field = {
  key: string
  label: string
  type?: 'text' | 'email' | 'url' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file'
  help?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
}

const sections: Record<string, { title: string; description: string; fields: Field[]; notice?: string }> = {
  store: {
    title: 'Store Information',
    description: 'Manage the public contact and identity information used in the storefront.',
    fields: [
      { key: 'storeName', label: 'Store name' },
      { key: 'storeEmail', label: 'Store email', type: 'email' },
      { key: 'supportContact', label: 'Customer support contact', help: 'Phone number or other customer support contact.' },
      { key: 'storeDescription', label: 'Store description', type: 'textarea' },
      { key: 'storeLogo', label: 'Current logo URL', help: 'Use an HTTPS URL or a path on this website.' },
      { key: 'storeLogoFile', label: 'Upload a new logo', type: 'file', help: 'JPG, PNG, WebP or GIF; maximum 8 MB.' },
      { key: 'youtubeUrl', label: 'YouTube', type: 'url' },
      { key: 'tiktokUrl', label: 'TikTok', type: 'url' },
      { key: 'instagramUrl', label: 'Instagram', type: 'url' },
      { key: 'facebookUrl', label: 'Facebook', type: 'url' },
    ],
  },
  orders: {
    title: 'Order Settings',
    description: 'Order records and payment verification remain controlled by the existing checkout integration.',
    fields: [],
    notice: 'Order numbers are database IDs and are referenced by payment callbacks. Pending orders are not automatically expired. Customer email confirmations and notifications are unavailable because this project has no configured email delivery service. Payment verification cannot be bypassed here.',
  },
  notifications: {
    title: 'Customer Notifications',
    description: 'Notification controls are unavailable until an email delivery service is configured.',
    fields: [],
    notice: 'No email delivery service is configured. Order confirmations, payment notices, download availability emails, cancellation emails and editable templates are not available. The website will not show these notifications as enabled.',
  },
  storefront: {
    title: 'Storefront Settings',
    description: 'Control homepage sections and the announcement shown to customers.',
    fields: [
      { key: 'announcementVisible', label: 'Show announcement banner', type: 'checkbox' },
      { key: 'announcement', label: 'Announcement message', type: 'textarea' },
      { key: 'showLatest', label: 'Show Latest Guitar Tabs', type: 'checkbox' },
      { key: 'showFeatured', label: 'Show Featured Arrangements', type: 'checkbox' },
      { key: 'showCategories', label: 'Show Browse by Category', type: 'checkbox' },
      { key: 'showBenefits', label: 'Show Why Choose Clinton’s Guitar', type: 'checkbox' },
      { key: 'showHowItWorks', label: 'Show How It Works', type: 'checkbox' },
      { key: 'footerContact', label: 'Footer contact information', type: 'textarea', help: 'Leave blank to use the store email.' },
    ],
    notice: 'These options only hide or show existing content; they never delete products or other stored data.',
  },
  general: {
    title: 'General Preferences',
    description: 'Set supported regional preferences and temporarily place the storefront in maintenance mode.',
    fields: [
      { key: 'timezone', label: 'Time zone', type: 'select', options: [{ value: 'Africa/Nairobi', label: 'Africa/Nairobi' }, { value: 'UTC', label: 'UTC' }] },
      { key: 'dateFormat', label: 'Date format', type: 'select', options: [{ value: 'en-KE', label: 'Kenya (en-KE)' }, { value: 'en-GB', label: 'United Kingdom (en-GB)' }, { value: 'en-US', label: 'United States (en-US)' }] },
      { key: 'maintenanceMode', label: 'Maintenance mode', type: 'checkbox', help: 'Shows a maintenance notice on the homepage and Shop page, and pauses checkout.' },
    ],
    notice: 'KES and the existing dark appearance remain fixed to preserve payment and brand behavior.',
  },
}

export default function AdminSettingsEditor({
  section,
  initialSettings,
  status,
}: {
  section: string
  initialSettings: Settings
  status: { emailConfigured: boolean }
}) {
  const config = sections[section]
  const [values, setValues] = useState(initialSettings)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!config) return <p className="admin-settings-alert">Settings section not found.</p>

  async function save(event: SettingsSubmitEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const body = new FormData()
      body.set('section', section)
      body.set('values', JSON.stringify(Object.fromEntries(config.fields.map((field) => [field.key, values[field.key]]))))
      if (logoFile) body.set('storeLogoFile', logoFile)
      const response = await fetch('/api/admin/settings', { method: 'PUT', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.')
      setValues(result.settings)
      setLogoFile(null)
      setMessage('Settings saved successfully.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  function setValue(key: string, value: string | number | boolean) {
    setValues({ ...values, [key]: value })
  }

  return (
    <section className="admin-settings-editor">
      <header className="admin-settings-page-heading">
        <div>
          <span className="admin-eyebrow">Settings centre</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
      </header>

      {section === 'notifications' && (
        <div className="admin-settings-status-grid">
          <div><span>Email delivery</span><strong>{status.emailConfigured ? 'Configured' : 'Not configured'}</strong></div>
        </div>
      )}

      {config.notice && <p className="admin-settings-alert">{config.notice}</p>}

      {config.fields.length > 0 && (
        <form className="admin-settings-form" onSubmit={save}>
          <div className="admin-settings-fields">
            {config.fields.map((field) => (
              <label className={field.type === 'checkbox' ? 'admin-settings-checkbox' : ''} key={field.key}>
                {field.type === 'checkbox' ? (
                  <>
                    <input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => setValue(field.key, event.target.checked)} />
                    <span><strong>{field.label}</strong>{field.help && <small>{field.help}</small>}</span>
                  </>
                ) : (
                  <>
                    <span>{field.label}</span>
                    {field.type === 'textarea' ? (
                      <textarea className="form-input" rows={3} value={String(values[field.key] ?? '')} onChange={(event) => setValue(field.key, event.target.value)} />
                    ) : field.type === 'select' ? (
                      <select className="form-input" value={String(values[field.key] ?? '')} onChange={(event) => setValue(field.key, event.target.value)}>
                        {field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    ) : field.type === 'file' ? (
                      <input className="admin-category-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
                    ) : (
                      <input
                        className="form-input"
                        type={field.type ?? 'text'}
                        min={field.min}
                        max={field.max}
                        value={String(values[field.key] ?? '')}
                        onChange={(event) => setValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                      />
                    )}
                    {field.help && <small>{field.help}</small>}
                  </>
                )}
              </label>
            ))}
          </div>
          {message && <p className="admin-settings-success" role="status">{message}</p>}
          {error && <p className="admin-settings-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </form>
      )}
    </section>
  )
}
