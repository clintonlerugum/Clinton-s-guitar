import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function GET() {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data) return NextResponse.json({ user: null })
  const user = await prisma.user.findUnique({ where: { id: data.id }, select: { id: true, email: true, name: true, role: true } })
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } })
}
