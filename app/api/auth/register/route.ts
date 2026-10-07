import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import bcrypt from 'bcrypt'
import { getAuthBaseUrl } from '../../../../lib/auth'

export async function POST(req: Request) {
  let email: unknown
  let password: unknown
  let name: unknown
  let redirectTo: string | undefined
  const contentType = req.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  try {
    if (isJson) {
      const data: unknown = await req.json()
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return NextResponse.json({ error: 'Please provide valid registration details.' }, { status: 400 })
      }
      email = 'email' in data ? data.email : undefined
      password = 'password' in data ? data.password : undefined
      name = 'name' in data ? data.name : undefined
    } else {
      const form = await req.formData()
      email = form.get('email')
      password = form.get('password')
      name = form.get('name')
      redirectTo = form.get('redirectTo') as string | undefined
    }
  } catch {
    return NextResponse.json({ error: 'Please provide valid registration details.' }, { status: 400 })
  }

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (name !== undefined && name !== null && typeof name !== 'string') {
    return NextResponse.json({ error: 'Enter a valid name.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email: normalizedEmail, name: typeof name === 'string' ? name.trim() || null : null, password: hashed }
    })

    if (isJson) {
      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 })
    }

    const safeRedirectTo = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : '/account'
    return NextResponse.redirect(new URL(
      `/login?redirectTo=${encodeURIComponent(safeRedirectTo)}`,
      getAuthBaseUrl(req.url)
    ))
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    console.error('Customer registration failed.', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
