import { NextResponse } from 'next/server'
import { isAdminRequest } from '../../../../../lib/admin-auth'
import { prisma } from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAdminRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await prisma.contactMessage.count({ where: { status: 'UNREAD' } })
    return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to count unread contact messages.', error)
    return NextResponse.json({ error: 'Unable to load unread message count.' }, { status: 500 })
  }
}
