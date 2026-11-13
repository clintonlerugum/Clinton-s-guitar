import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getTokenFromCookies, signToken, verifyToken } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

export async function PUT(request: Request) {
  const token = getTokenFromCookies()
  const identity = verifyToken(token)
  if (!identity || typeof identity === 'string' || typeof identity.id !== 'string' || identity.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 })
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid account update.' }, { status: 400 })
  }
  const { currentPassword, email, newPassword } = payload as Record<string, unknown>
  if (typeof currentPassword !== 'string' || typeof email !== 'string' || (newPassword !== undefined && typeof newPassword !== 'string')) {
    return NextResponse.json({ error: 'Enter your current password and a valid email address.' }, { status: 400 })
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid admin email address.' }, { status: 400 })
  }
  if (typeof newPassword === 'string' && newPassword.length > 0 && (newPassword.length < 10 || newPassword.length > 72)) {
    return NextResponse.json({ error: 'A new password must be between 10 and 72 characters.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: identity.id } })
  if (!user || user.role !== 'ADMIN' || !(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 })
  }
  const duplicate = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id: user.id } }, select: { id: true } })
  if (duplicate) return NextResponse.json({ error: 'That email address is already in use.' }, { status: 409 })

  let updated
  try {
    updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedEmail,
        ...(typeof newPassword === 'string' && newPassword ? { password: await bcrypt.hash(newPassword, 10) } : {}),
      },
      select: { id: true, email: true, role: true },
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That email address is already in use.' }, { status: 409 })
    }
    console.error('Unable to update admin account.', error)
    return NextResponse.json({ error: 'Unable to update the admin account.' }, { status: 500 })
  }
  const refreshedToken = signToken(updated)
  const requestUrl = new URL(request.url)
  const secure = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https' || requestUrl.protocol === 'https:'
  const response = NextResponse.json({ ok: true, email: updated.email })
  response.cookies.set('token', refreshedToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: 7 * 24 * 60 * 60,
  })
  return response
}
