import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import bcrypt from 'bcrypt'
import { signToken } from '../../../../lib/auth'

export async function POST(req: Request) {
  let email: string | undefined
  let password: string | undefined
  let redirectTo: string | undefined
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await req.json()
    email = data.email
    password = data.password
  } else {
    const form = await req.formData()
    email = form.get('email') as string | undefined
    password = form.get('password') as string | undefined
    redirectTo = form.get('redirectTo') as string | undefined
  }
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  // If this was a form post, redirect to admin dashboard; otherwise return JSON
  const isJson = contentType.includes('application/json')
  const requestUrl = new URL(req.url)
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const secure = forwardedProto === 'https' || requestUrl.protocol === 'https:'
  const cookieOptions = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure,
    maxAge: 7 * 24 * 60 * 60
  }
  if (isJson) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('token', token, cookieOptions)
    return res
  }
  // determine redirect for form posts
  const safeRedirectTo = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
    ? redirectTo
    : '/admin'
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: safeRedirectTo }
  })
  res.cookies.set('token', token, cookieOptions)
  return res
}
