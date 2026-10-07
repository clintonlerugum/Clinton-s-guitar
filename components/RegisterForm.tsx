'use client'

import { useState } from 'react'

export default function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || success) return

    setSubmitting(true)
    setMessage('')

    const form = new FormData(event.currentTarget)
    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 15_000)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          redirectTo
        }),
        signal: controller.signal
      })
      const result: unknown = await response.json().catch(() => null)
      const errorMessage = typeof result === 'object' && result !== null && 'error' in result &&
        typeof result.error === 'string'
        ? result.error
        : 'Registration failed. Please try again.'

      if (!response.ok) {
        setMessage(errorMessage)
        return
      }

      setSuccess(true)
      setMessage('Account created successfully! Redirecting you to log in...')
      setTimeout(() => {
        window.location.assign(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
      }, 1500)
    } catch {
      setMessage(timedOut
        ? 'The request is taking too long. Please check your connection and try again.'
        : 'Unable to connect. Please check your connection and try again.')
    } finally {
      clearTimeout(timeout)
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-sm grid gap-3">
        <input name="name" placeholder="Full name" className="px-3 py-2 bg-gray-800 rounded" />
        <input name="email" type="email" placeholder="Email" required className="px-3 py-2 bg-gray-800 rounded" />
        <input name="password" type="password" placeholder="Password" required className="px-3 py-2 bg-gray-800 rounded" />
        <button type="submit" disabled={submitting || success} className="px-4 py-2 bg-accent text-black rounded">
          {submitting ? 'Creating your account...' : 'Register'}
        </button>
      </form>
      {message && (
        <p role={success ? 'status' : 'alert'} aria-live="polite" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </>
  )
}
