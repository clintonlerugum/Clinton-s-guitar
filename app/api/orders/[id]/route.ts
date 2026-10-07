import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

const deletableStatuses = ['PENDING', 'FAILED']

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = verifyToken(getTokenFromCookies())
  if (!auth || typeof auth === 'string' || typeof auth.id !== 'string') {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (auth.role !== 'ADMIN' && auth.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'You are not authorized to delete orders.' }, { status: 403 })
  }

  const isAdmin = auth.role === 'ADMIN'

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Order" WHERE "id" = ${params.id} FOR UPDATE
      `
      if (!locked.length) return 'not-found' as const

      const order = await transaction.order.findUnique({
        where: { id: params.id },
        include: { payment: true }
      })
      if (!order) return 'not-found' as const
      if (!isAdmin && order.userId !== auth.id) return 'not-found' as const

      if (
        !deletableStatuses.includes(order.status) ||
        (order.payment && !deletableStatuses.includes(order.payment.status))
      ) {
        return 'not-deletable' as const
      }

      await transaction.payment.deleteMany({ where: { orderId: order.id } })
      await transaction.orderItem.deleteMany({ where: { orderId: order.id } })
      const deleted = await transaction.order.deleteMany({
        where: {
          id: order.id,
          status: { in: deletableStatuses },
          ...(isAdmin ? {} : { userId: auth.id })
        }
      })
      if (deleted.count !== 1) throw new Error('Order changed while being deleted.')
      return 'deleted' as const
    })

    if (outcome === 'not-found') {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }
    if (outcome === 'not-deletable') {
      return NextResponse.json({ error: 'Only pending or failed orders can be deleted.' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Order deletion failed.', error)
    return NextResponse.json({ error: 'Unable to delete this order. Please try again.' }, { status: 500 })
  }
}
