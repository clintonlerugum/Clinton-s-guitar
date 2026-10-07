import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getCallbackItem, isValidKenyanPhone, normalizeKenyanPhone, queryStkPushStatus } from '../../../../../lib/mpesa'
import { finalizeMpesaPayment } from '../../../../../lib/payment-reconciliation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPhone(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const rawPhone = String(value)
  if (!/^\+?(?:2547\d{8}|07\d{8}|7\d{8})$/.test(rawPhone)) return null
  const phone = normalizeKenyanPhone(rawPhone)
  return isValidKenyanPhone(phone) ? phone : null
}

export async function POST(req: Request) {
  let callback: unknown
  try {
    callback = await req.json()
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid JSON' }, { status: 400 })
  }

  const body = isRecord(callback) && isRecord(callback.Body) ? callback.Body : null
  const result = body && isRecord(body.stkCallback) ? body.stkCallback : null
  const checkoutRequestId = result?.CheckoutRequestID
  const merchantRequestId = result?.MerchantRequestID
  const resultCode = result?.ResultCode
  if (
    !result ||
    typeof checkoutRequestId !== 'string' ||
    checkoutRequestId.length === 0 ||
    typeof merchantRequestId !== 'string' ||
    merchantRequestId.length === 0 ||
    typeof resultCode !== 'number' ||
    !Number.isSafeInteger(resultCode)
  ) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback shape' }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { checkoutRequestId },
    include: { order: { include: { items: true } } }
  })
  if (!payment) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unknown checkout request' }, { status: 404 })
  if (payment.provider !== 'MPESA') {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment provider does not match' }, { status: 400 })
  }
  if (!payment.merchantRequestId || payment.merchantRequestId !== merchantRequestId) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Merchant request does not match' }, { status: 400 })
  }

  const rawCallback = JSON.stringify(callback).slice(0, 10000)
  let receiptNumber: string | null = null
  let phone: string | null = null
  let amount: number | null = null
  if (resultCode === 0) {
    const metadataItems = isRecord(result.CallbackMetadata) ? result.CallbackMetadata.Item : null
    const amountValue = getCallbackItem(metadataItems, 'Amount')
    const receiptValue = getCallbackItem(metadataItems, 'MpesaReceiptNumber')
    const phoneValue = getCallbackItem(metadataItems, 'PhoneNumber')
    amount = typeof amountValue === 'number'
      ? amountValue
      : typeof amountValue === 'string' && /^\d+$/.test(amountValue)
        ? Number(amountValue)
        : Number.NaN
    receiptNumber = typeof receiptValue === 'string' ? receiptValue.trim() : ''
    phone = getPhone(phoneValue)

    if (
      !Number.isSafeInteger(amount) ||
      amount !== payment.amount ||
      !receiptNumber ||
      !/^[A-Z0-9]{8,20}$/i.test(receiptNumber) ||
      !phone ||
      phone !== payment.phone ||
      payment.order.total !== payment.amount ||
      payment.order.currency !== 'KES' ||
      !payment.order.userId
    ) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment validation failed' }, { status: 400 })
    }
  }

  if (resultCode === 0 && payment.status === 'PENDING' && payment.order.status === 'PENDING') {
    const verification = await queryStkPushStatus(checkoutRequestId)
    if (
      verification.state !== 'paid' ||
      verification.checkoutRequestId !== checkoutRequestId ||
      verification.resultCode !== 0 ||
      verification.amount !== amount ||
      verification.phone !== phone ||
      verification.receiptNumber !== receiptNumber
    ) {
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Callback received; payment verification is pending'
      })
    }
  }

  const outcome = await finalizeMpesaPayment({
    paymentId: payment.id,
    checkoutRequestId,
    merchantRequestId,
    resultCode,
    state: resultCode === 0 ? 'paid' : 'failed',
    amount: resultCode === 0 ? amount ?? undefined : undefined,
    phone: resultCode === 0 ? phone ?? undefined : undefined,
    receiptNumber: resultCode === 0 ? receiptNumber ?? undefined : undefined,
    rawResponse: rawCallback
  })

  if (outcome === 'correlation-failed') {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment correlation failed' }, { status: 409 })
  }
  if (outcome === 'validation-failed') {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment validation failed' }, { status: 400 })
  }
  if (outcome === 'order-not-pending') {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment is already finalized' }, { status: 409 })
  }
  if (outcome === 'terminal-conflict') {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment is already finalized with a different result' }, { status: 409 })
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: outcome === 'failed' ? 'Payment marked failed' : 'Callback accepted' })
}
