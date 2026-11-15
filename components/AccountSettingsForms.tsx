'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormNotice = { kind: 'success' | 'error'; text: string } | null

async function submitAccountUpdate(payload: Record<string, string>) {
  const response = await fetch('/api/account/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to update your account.')
  return result
}

export function AccountProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [notice, setNotice] = useState<FormNotice>(null)
  const [saving, setSaving] = useState(false)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const result = await submitAccountUpdate({ action: 'profile', name })
      setName(result.name ?? '')
      setNotice({ kind: 'success', text: 'Your profile has been updated.' })
      router.refresh()
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to update your profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="customer-account-form" onSubmit={saveProfile}>
      <label className="customer-form-field">
        <span>Name</span>
        <input
          autoComplete="name"
          maxLength={100}
          name="name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      {notice && <p className={`customer-form-notice customer-form-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <button className="customer-action-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  )
}

export function AccountPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notice, setNotice] = useState<FormNotice>(null)
  const [saving, setSaving] = useState(false)

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setNotice({ kind: 'error', text: 'The new passwords do not match.' })
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      await submitAccountUpdate({ action: 'password', currentPassword, newPassword, confirmPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNotice({ kind: 'success', text: 'Your password has been changed.' })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to change your password.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="customer-account-form customer-password-form" onSubmit={changePassword}>
      <label className="customer-form-field">
        <span>Current password</span>
        <input
          autoComplete="current-password"
          name="currentPassword"
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </label>
      <label className="customer-form-field">
        <span>New password</span>
        <input
          autoComplete="new-password"
          minLength={10}
          name="newPassword"
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
        <small>Use 10 or more characters.</small>
      </label>
      <label className="customer-form-field">
        <span>Confirm new password</span>
        <input
          autoComplete="new-password"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>
      {notice && <p className={`customer-form-notice customer-form-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
      <button className="customer-action-button" disabled={saving} type="submit">{saving ? 'Updating…' : 'Change password'}</button>
    </form>
  )
}
