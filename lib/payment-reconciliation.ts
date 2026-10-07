import { prisma } from './prisma'

export type PaymentFinalization =
  | 'paid'
  | 'failed'
  | 'already-finalized'
  | 'terminal-conflict'
  | 'correlation-failed'
  | 'order-not-pending'
  | 'validation-failed'

export async function finalizeMpesaPayment(input: {
  paymentId: string
  checkoutRequestId: string
  merchantRequestId?: string
  resultCode: number
  state: 'paid' | 'failed'
  amount?: number
  phone?: string
  receiptNumber?: string
  rawResponse: string
}): Promise<PaymentFinalization> {
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: input.paymentId },
      include: { order: { include: { items: true } } }
    })
    if (
      !payment ||
      payment.provider !== 'MPESA' ||
      payment.checkoutRequestId !== input.checkoutRequestId ||
      (input.merchantRequestId !== undefined && payment.merchantRequestId !== input.merchantRequestId)
    ) {
      return 'correlation-failed'
    }

    if (payment.status === 'PAID') {
      return input.state === 'paid' && (input.receiptNumber === undefined || input.receiptNumber === payment.receiptNumber)
        ? 'already-finalized'
        : 'terminal-conflict'
    }
    if (payment.status === 'FAILED') {
      return input.state === 'failed' ? 'already-finalized' : 'terminal-conflict'
    }
    if (payment.status !== 'PENDING' || payment.order.status !== 'PENDING') return 'order-not-pending'
    if (
      payment.amount !== payment.order.total ||
      payment.order.currency !== 'KES' ||
      (input.amount !== undefined && input.amount !== payment.amount) ||
      (input.phone !== undefined && input.phone !== payment.phone) ||
      (input.receiptNumber !== undefined && !/^[A-Z0-9]{8,20}$/i.test(input.receiptNumber)) ||
      (input.state === 'paid' && (!payment.order.userId || !payment.order.items.length))
    ) {
      return 'validation-failed'
    }

    const finalStatus = input.state === 'paid' ? 'PAID' : 'FAILED'
    const orderUpdate = await transaction.order.updateMany({
      where: { id: payment.orderId, status: 'PENDING' },
      data: { status: finalStatus }
    })
    if (orderUpdate.count !== 1) return 'order-not-pending'

    const paymentUpdate = await transaction.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        status: finalStatus,
        resultCode: input.resultCode,
        receiptNumber: input.state === 'paid' ? input.receiptNumber ?? payment.receiptNumber : payment.receiptNumber,
        rawCallback: input.rawResponse
      }
    })
    if (paymentUpdate.count !== 1) {
      throw new Error(`Could not safely finalize M-Pesa payment ${payment.id}`)
    }

    if (input.state === 'paid') {
      for (const item of payment.order.items) {
        await transaction.download.upsert({
          where: { user_product_download: { userId: payment.order.userId!, productId: item.productId } },
          update: {},
          create: { userId: payment.order.userId!, productId: item.productId }
        })
      }
    }

    return input.state
  })
}
