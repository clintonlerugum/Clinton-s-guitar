'use client'

import { useState } from 'react'

type SettingsSubmitEvent = { preventDefault(): void; currentTarget: HTMLFormElement }

export default function AdminSecuritySettings({ email }: { email: string }) {
  const [currentEmail, setCurrentEmail] = useState(email)
  const [newEmail, setNewEmail] = useState(email)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(event: SettingsSubmitEvent) {
    event.preventDefault()
    const formElement = event.currentTarget
    setMessage('')
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/admin/settings/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          email: form.get('email'),
          newPassword: form.get('newPassword'),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update account.')
      if (typeof result.email === 'string') {
        setCurrentEmail(result.email)
        setNewEmail(result.email)
      }
      setMessage('Admin account updated. Your current session has been refreshed.')
      formElement.reset()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-settings-editor">
      <header className="admin-settings-page-heading">
        <div>
          <span className="admin-eyebrow">Settings centre</span>
          <h1>Admin Account &amp; Security</h1>
          <p>Verify your current password before changing account details.</p>
        </div>
      </header>
      <form className="admin-settings-form" onSubmit={save}>
        <div className="admin-settings-fields">
          <label><span>Current admin email</span><input className="form-input" value={currentEmail} readOnly /></label>
          <label><span>New admin email</span><input className="form-input" type="email" name="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required maxLength={254} /></label>
          <label><span>Current password (required)</span><input className="form-input" type="password" name="currentPassword" autoComplete="current-password" required /></label>
          <label><span>New password (optional)</span><input className="form-input" type="password" name="newPassword" autoComplete="new-password" minLength={10} /></label>
        </div>
        {message && <p className="admin-settings-success" role="status">{message}</p>}
        {error && <p className="admin-settings-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Account Changes'}</button>
      </form>
      <form action="/api/auth/logout" method="post" className="admin-settings-logout">
        <p>End the current admin session on this device.</p>
        <button type="submit" className="admin-category-action">Log out</button>
      </form>
    </section>
  )
}
