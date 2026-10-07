import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { finalizeMpesaPayment } from '../../../../../lib/payment-reconciliation'
import { queryStkPushStatus } from '../../../../../lib/mpesa'

function redirectToOrder(req: Request, orderId: string, result: string) {
  const target = new URL('/checkout/pending', req.url)
  target.searchParams.set('orderId', orderId)
  target.searchParams.set('reconciled', result)
  return new NextResponse(null, {
    status: 303,
    headers: { Location: target.toString() }
  })
}

export async function POST(req: Request) {
  const user = verifyToken(getTokenFromCookies())
  if (!user || typeof user === 'string' || typeof user.id !== 'string') {
    return NextResponse.redirect(new URL('/login?redirectTo=%2Faccount', req.url))
  }

  const form = await req.formData()
  const orderId = form.get('orderId')
  if (typeof orderId !== 'string' || orderId.length === 0) {
    return NextResponse.redirect(new URL('/account', req.url))
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payment: true }
  })
  if (!order?.payment || order.payment.provider !== 'MPESA') {
    return redirectToOrder(req, orderId, 'unavailable')
  }
  if (order.status === 'PAID' || order.payment.status === 'PAID') {
    return redirectToOrder(req, orderId, 'paid')
  }
  if (order.status === 'FAILED' || order.payment.status === 'FAILED') {
    return redirectToOrder(req, orderId, 'failed')
  }
  if (order.status !== 'PENDING' || order.payment.status !== 'PENDING') {
    return redirectToOrder(req, orderId, 'unavailable')
  }
  if (!order.payment.checkoutRequestId) {
    return redirectToOrder(req, orderId, 'unavailable')
  }

  const status = await queryStkPushStatus(order.payment.checkoutRequestId)
  if (status.state === 'pending' || status.state === 'invalid') {
    if (status.state === 'invalid') {
      console.error(`Rejected M-Pesa reconciliation result for order ${order.id}.`, status.reason)
      return redirectToOrder(req, orderId, 'unverified')
    }
    console.warn(`M-Pesa reconciliation remains pending for order ${order.id}.`, status.reason)
    return redirectToOrder(req, orderId, 'pending')
  }

  const outcome = await finalizeMpesaPayment({
    paymentId: order.payment.id,
    checkoutRequestId: status.checkoutRequestId,
    resultCode: status.resultCode,
    state: status.state,
    amount: status.amount,
    phone: status.phone,
    receiptNumber: status.receiptNumber,
    rawResponse: status.rawResponse
  })

  if (outcome === 'paid' || outcome === 'already-finalized' && status.state === 'paid') {
    return redirectToOrder(req, orderId, 'paid')
  }
  if (outcome === 'failed' || outcome === 'already-finalized' && status.state === 'failed') {
    return redirectToOrder(req, orderId, 'failed')
  }
  if (outcome === 'validation-failed' || outcome === 'correlation-failed') {
    console.error(`M-Pesa reconciliation did not match pending order ${order.id}.`, outcome)
    return redirectToOrder(req, orderId, 'unverified')
  }
  if (outcome === 'terminal-conflict' || outcome === 'order-not-pending') {
    const latest = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } })
    return redirectToOrder(req, orderId, latest?.status === 'PAID' ? 'paid' : latest?.status === 'FAILED' ? 'failed' : 'pending')
  }
  return redirectToOrder(req, orderId, 'pending')
}
