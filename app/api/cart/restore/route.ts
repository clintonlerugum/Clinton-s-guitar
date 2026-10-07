import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { parseCartCookieHeader } from '../../../../lib/cart'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: Request) {
  const form = await req.formData()
  const orderId = form.get('orderId')
  if (typeof orderId !== 'string' || !orderId) {
    return NextResponse.redirect(new URL('/cart?error=empty', req.url))
  }

  const user = verifyToken(getTokenFromCookies())
  if (!user || typeof user === 'string' || typeof user.id !== 'string') {
    const returnPath = `/checkout/pending?orderId=${encodeURIComponent(orderId)}`
    return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(returnPath)}`, req.url))
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id, status: 'FAILED' },
    include: { items: { include: { product: true } } }
  })
  if (!order) return NextResponse.redirect(new URL('/account', req.url))

  const cart = parseCartCookieHeader(req.headers.get('cookie') || '') ?? []
  const quantities = new Map(cart.map((item) => [item.productId, item.quantity]))
  for (const item of order.items) {
    if (!item.product.published || !item.product.fullPdf) continue
    quantities.set(item.productId, Math.max(quantities.get(item.productId) ?? 0, item.quantity))
  }

  if (!order.items.some((item) => item.product.published && item.product.fullPdf)) {
    return NextResponse.redirect(new URL('/cart?error=empty', req.url))
  }

  const restoredCart = Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }))
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: new URL('/cart', req.url).toString() }
  })
  response.cookies.set('cart', JSON.stringify(restoredCart), { path: '/', httpOnly: false })
  return response
}
