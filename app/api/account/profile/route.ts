import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function PATCH(req: Request) {
  const auth = verifyToken(getTokenFromCookies())
  if (!auth || typeof auth === 'string' || typeof auth.id !== 'string') {
    return NextResponse.json({ error: 'Please sign in to update your account.' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Please provide valid account details.' }, { status: 400 })
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Please provide valid account details.' }, { status: 400 })
  }

  const body = payload as Record<string, unknown>
  if (body.action !== 'profile' && body.action !== 'password') {
    return NextResponse.json({ error: 'Choose a valid account update.' }, { status: 400 })
  }

  try {
    if (body.action === 'profile') {
      if (typeof body.name !== 'string' || body.name.trim().length > 100) {
        return NextResponse.json({ error: 'Enter a name with no more than 100 characters.' }, { status: 400 })
      }

      const updated = await prisma.user.updateMany({
        where: { id: auth.id },
        data: { name: body.name.trim() || null }
      })
      if (updated.count !== 1) {
        return NextResponse.json({ error: 'Your account could not be found. Please sign in again.' }, { status: 401 })
      }

      return NextResponse.json({ ok: true, name: body.name.trim() || null }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (
      typeof body.currentPassword !== 'string' ||
      typeof body.newPassword !== 'string' ||
      typeof body.confirmPassword !== 'string' ||
      body.newPassword.length < 10 ||
      Buffer.byteLength(body.newPassword, 'utf8') > 72
    ) {
      return NextResponse.json({ error: 'Enter your current password and a new password of 10–72 characters.' }, { status: 400 })
    }
    if (body.newPassword !== body.confirmPassword) {
      return NextResponse.json({ error: 'The new passwords do not match.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { id: true, password: true }
    })
    if (!user) {
      return NextResponse.json({ error: 'Your account could not be found. Please sign in again.' }, { status: 401 })
    }
    if (!(await bcrypt.compare(body.currentPassword, user.password))) {
      return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(body.newPassword, 10) }
    })

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Customer account update failed.', error)
    return NextResponse.json({ error: 'Unable to update your account. Please try again.' }, { status: 500 })
  }
}
