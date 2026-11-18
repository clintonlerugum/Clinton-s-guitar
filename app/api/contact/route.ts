import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getStoreSettings } from '../../../lib/store-settings'

export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_BODY_BYTES = 16_000
const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT = 3
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000

type ContactInput = {
  name?: unknown
  email?: unknown
  subject?: unknown
  message?: unknown
  company?: unknown
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function hasHeaderControls(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value)
}

async function sendNotification(name: string, email: string, subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!apiKey || !from) {
    console.error('Contact email notification is not configured: set RESEND_API_KEY and CONTACT_FROM_EMAIL.')
    return false
  }

  try {
    const settings = await getStoreSettings()
    const to = settings.storeEmail.trim()
    if (!EMAIL_PATTERN.test(to)) {
      console.error('Contact email notification skipped: store recipient address is invalid.')
      return false
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: email,
          subject: `New contact message: ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const providerError = await response.json().catch(() => ({})) as { name?: unknown; message?: unknown }
        const errorName = typeof providerError.name === 'string' ? providerError.name.slice(0, 80) : 'unknown'
        const errorMessage = typeof providerError.message === 'string'
          ? providerError.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').slice(0, 300)
          : 'No provider error message was returned.'
        console.error('Contact email notification provider rejected the request.', {
          status: response.status,
          name: errorName,
          message: errorMessage,
        })
        return false
      }
      return true
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error('Contact email notification could not be delivered.', error)
    return false
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return NextResponse.json({ error: 'Please submit the contact form using the website.' }, { status: 415 })
  }
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 })
    }
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Your message is too large to submit.' }, { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'We could not read your message. Please try again.' }, { status: 400 })
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Your message is too large to submit.' }, { status: 413 })
  }

  let input: ContactInput
  try {
    input = JSON.parse(rawBody) as ContactInput
  } catch {
    return NextResponse.json({ error: 'Please submit the contact form using the website.' }, { status: 400 })
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }
  if (text(input.company)) {
    return NextResponse.json({ error: 'The form could not be submitted. Please try again.' }, { status: 400 })
  }

  const name = text(input.name)
  const email = text(input.email).toLowerCase()
  const subject = text(input.subject)
  const message = text(input.message)

  if (name.length < 2 || name.length > 100 || hasHeaderControls(name)) {
    return NextResponse.json({ error: 'Enter your name using 2 to 100 characters.' }, { status: 400 })
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || hasHeaderControls(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (subject.length < 3 || subject.length > 120 || hasHeaderControls(subject)) {
    return NextResponse.json({ error: 'Enter a subject using 3 to 120 characters.' }, { status: 400 })
  }
  if (message.length < 10 || message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    return NextResponse.json({ error: 'Your message must be between 10 and 5,000 characters.' }, { status: 400 })
  }

  const now = new Date()
  const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS)
  const rateLimitSince = new Date(now.getTime() - RATE_WINDOW_MS)
  try {
    const duplicate = await prisma.contactMessage.findFirst({
      where: { email, subject, message, createdAt: { gte: duplicateSince } },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }

    const recentSubmissions = await prisma.contactMessage.count({
      where: { email, createdAt: { gte: rateLimitSince } },
    })
    if (recentSubmissions >= RATE_LIMIT) {
      return NextResponse.json({ error: 'Too many messages were sent from this email recently. Please try again later.' }, { status: 429 })
    }

    await prisma.contactMessage.create({
      data: { name, email, subject, message },
      select: { id: true },
    })
  } catch (error) {
    console.error('Unable to save contact message.', error)
    return NextResponse.json({ error: 'We could not save your message. Please try again later.' }, { status: 500 })
  }

  const emailAccepted = await sendNotification(name, email, subject, message)
  return NextResponse.json({ ok: true, emailAccepted }, { status: emailAccepted ? 201 : 202 })
}
