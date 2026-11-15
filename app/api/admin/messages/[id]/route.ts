import { NextResponse } from 'next/server'
import { isAdminRequest } from '../../../../../lib/admin-auth'
import { prisma } from '../../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let input: { status?: unknown }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid message update.' }, { status: 400 })
  }
  const status = input?.status
  if (status !== 'READ' && status !== 'UNREAD') {
    return NextResponse.json({ error: 'Choose a valid message status.' }, { status: 400 })
  }

  try {
    const result = await prisma.contactMessage.updateMany({
      where: { id: params.id },
      data: { status },
    })
    if (result.count === 0) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })
    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error('Unable to update contact message status.', error)
    return NextResponse.json({ error: 'Unable to update message status.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await prisma.contactMessage.deleteMany({ where: { id: params.id } })
    if (result.count === 0) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unable to delete contact message.', error)
    return NextResponse.json({ error: 'Unable to delete message.' }, { status: 500 })
  }
}
