import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'
import { getMpesaCheckoutFailureDiagnostics, initiateStkPush, isValidKenyanPhone, MpesaRequestError, normalizeKenyanPhone } from '../../../lib/mpesa'
import { parseCartCookieHeader } from '../../../lib/cart'

const duplicateCheckoutWindowMs = 5 * 60 * 1000
type CheckoutOrder = Prisma.OrderGetPayload<{ include: { items: true; payment: true } }>

function mpesaEnabled() {
  const mode = process.env.PAYMENT_MODE?.trim().toLowerCase()
  return mode === 'live' || mode === 'mpesa'
}

function sameCart(
  orderItems: Array<{ productId: string; quantity: number; priceAtPurchase: number }>,
  cartItems: Array<{ productId: string; quantity: number; priceAtPurchase: number }>
) {
  const signature = (items: typeof orderItems) => items
    .map((item) => `${item.productId}:${item.quantity}:${item.priceAtPurchase}`)
    .sort()
  const orderSignature = signature(orderItems)
  const cartSignature = signature(cartItems)
  return orderSignature.length === cartSignature.length &&
    orderSignature.every((item, index) => item === cartSignature[index])
}

export async function POST(req: Request) {
  const token = getTokenFromCookies()
  const user = verifyToken(token)
  if (!user || typeof user === 'string' || typeof user.id !== 'string') {
    return NextResponse.redirect(new URL('/login?redirectTo=%2Fcart', req.url))
  }

  const form = await req.formData()
  const phone = normalizeKenyanPhone(String(form.get('phone') || ''))
  if (!isValidKenyanPhone(phone)) return NextResponse.redirect(new URL('/cart?error=phone', req.url))

  const cart = parseCartCookieHeader(req.headers.get('cookie') || '')
  if (!cart) return NextResponse.redirect(new URL('/cart?error=invalid', req.url))
  if (!cart.length) return NextResponse.redirect(new URL('/cart?error=empty', req.url))

  const products = await prisma.product.findMany({
    where: { id: { in: cart.map((item) => item.productId) }, published: true, fullPdf: { not: null } }
  })
  const itemsData = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)
    if (!product) return []
    return [{ productId: product.id, quantity: item.quantity, priceAtPurchase: product.price }]
  })
  if (!itemsData.length) return NextResponse.redirect(new URL('/cart?error=empty', req.url))
  if (products.some((product) => product.currency !== 'KES')) {
    return NextResponse.redirect(new URL('/cart?error=currency', req.url))
  }

  const total = itemsData.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0)
  if (!Number.isSafeInteger(total) || total > 2_147_483_647) {
    return NextResponse.redirect(new URL('/cart?error=invalid', req.url))
  }
  let checkoutOrder: { order: CheckoutOrder; reused: boolean }
  const duplicateCutoff = new Date(Date.now() - duplicateCheckoutWindowMs)
  for (let attempt = 0; ; attempt += 1) {
    try {
      checkoutOrder = await prisma.$transaction(async (transaction) => {
        const recentPendingOrders = await transaction.order.findMany({
          where: {
            userId: user.id,
            status: 'PENDING',
            total,
            currency: 'KES',
            createdAt: { gte: duplicateCutoff },
            payment: { is: { provider: 'MPESA', status: 'PENDING', phone } }
          },
          include: { items: true, payment: true },
          orderBy: { createdAt: 'desc' }
        })
        const duplicate = recentPendingOrders.find((candidate) => sameCart(candidate.items, itemsData))
        if (duplicate?.payment) return { order: duplicate, reused: true }

        const order = await transaction.order.create({
          data: {
            userId: user.id,
            total,
            currency: 'KES',
            status: 'PENDING',
            items: { create: itemsData },
            payment: { create: { provider: 'MPESA', amount: total, phone, status: 'PENDING' } }
          },
          include: { items: true, payment: true }
        })
        return { order, reused: false }
      })
      break
    } catch (error) {
      if (attempt >= 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  const { order, reused } = checkoutOrder
  if (reused) {
    if (!order.payment) throw new Error(`Pending checkout order ${order.id} has no payment record`)
    const target = new URL(`/checkout/pending?orderId=${order.id}`, req.url)
    if (!order.payment.checkoutRequestId) {
      target.searchParams.set(mpesaEnabled() ? 'uncertain' : 'demo', '1')
    }
    const response = NextResponse.redirect(target, { status: 303 })
    response.cookies.set('cart', '', { path: '/', maxAge: 0 })
    return response
  }

  if (!mpesaEnabled()) {
    const response = NextResponse.redirect(new URL(`/checkout/pending?orderId=${order.id}&demo=1`, req.url), { status: 303 })
    response.cookies.set('cart', '', { path: '/', maxAge: 0 })
    return response
  }

  let stk: Awaited<ReturnType<typeof initiateStkPush>>
  try {
    stk = await initiateStkPush({
      amount: total,
      phone,
      accountReference: order.id,
      transactionDescription: `Guitar tabs order ${order.id}`
    })
  } catch (error) {
    if (error instanceof MpesaRequestError && error.outcome === 'ambiguous') {
      if (error.checkoutRequestId || error.merchantRequestId) {
        try {
          await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              merchantRequestId: error.merchantRequestId,
              checkoutRequestId: error.checkoutRequestId
            }
          })
        } catch (saveError) {
          console.error(`Could not save partial M-Pesa identifiers for order ${order.id}.`, saveError)
        }
      }
      console.error(`M-Pesa checkout initiation failed for order ${order.id}.`, getMpesaCheckoutFailureDiagnostics(error))
      const response = NextResponse.redirect(new URL(`/checkout/pending?orderId=${order.id}&uncertain=1`, req.url), { status: 303 })
      response.cookies.set('cart', '', { path: '/', maxAge: 0 })
      return response
    }

    await prisma.$transaction(async (transaction) => {
      const orderUpdate = await transaction.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'FAILED' }
      })
      const paymentUpdate = await transaction.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { status: 'FAILED' }
      })
      if (orderUpdate.count !== 1 || paymentUpdate.count !== 1) {
        throw new Error(`Could not safely mark rejected M-Pesa request for order ${order.id} as failed`)
      }
    })
    console.error(`M-Pesa checkout initiation failed for order ${order.id}.`, getMpesaCheckoutFailureDiagnostics(error))
    return new NextResponse(null, {
      status: 303,
      headers: { Location: '/cart?error=payment' }
    })
  }

  try {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { merchantRequestId: stk.MerchantRequestID, checkoutRequestId: stk.CheckoutRequestID }
    })
  } catch (error) {
    console.error(`Could not save M-Pesa identifiers for order ${order.id}; leaving it pending for reconciliation.`, error)
    const response = NextResponse.redirect(new URL(`/checkout/pending?orderId=${order.id}&uncertain=1`, req.url), { status: 303 })
    response.cookies.set('cart', '', { path: '/', maxAge: 0 })
    return response
  }

  const response = NextResponse.redirect(new URL(`/checkout/pending?orderId=${order.id}`, req.url), { status: 303 })
  response.cookies.set('cart', '', { path: '/', maxAge: 0 })
  return response
}
