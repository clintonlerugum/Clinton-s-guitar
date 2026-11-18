'use client'

import { useState } from 'react'

type ContactResult = { ok?: boolean; emailAccepted?: boolean; duplicate?: boolean; error?: string }

export default function ContactForm() {
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setSending(true)
    setSuccess('')
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          subject: formData.get('subject'),
          message: formData.get('message'),
          company: formData.get('company'),
        }),
      })
      const result = await response.json() as ContactResult
      if (!response.ok || !result.ok) throw new Error(result.error || 'We could not save your message. Please try again.')
      form.reset()
      if (result.duplicate) {
        setSuccess('We already received this message. You do not need to submit it again.')
      } else if (result.emailAccepted) {
        setSuccess('Thank you. Your message has been received. The email notification was accepted by our provider.')
      } else {
        setError('Your message is saved to our inbox, but the email notification could not be sent. Please do not submit it again.')
      }
    } catch (submitError) {
      console.error('Contact form submission failed.', submitError)
      setError(submitError instanceof Error ? submitError.message : 'We could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label className="contact-form-field">
        <span>Full Name</span>
        <input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required />
      </label>
      <label className="contact-form-field">
        <span>Email Address</span>
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label className="contact-form-field">
        <span>Subject</span>
        <input name="subject" type="text" minLength={3} maxLength={120} required />
      </label>
      <label className="contact-form-field">
        <span>Message</span>
        <textarea name="message" rows={6} minLength={10} maxLength={5000} required />
      </label>
      <label className="contact-honeypot" aria-hidden="true">
        Leave this field empty
        <input name="company" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      {success && <p className="contact-form-notice is-success" role="status">{success}</p>}
      {error && <p className="contact-form-notice is-error" role="alert">{error}</p>}
      <button className="contact-submit-button" type="submit" disabled={sending}>
        {sending ? 'Sending…' : 'Send Message'} <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
