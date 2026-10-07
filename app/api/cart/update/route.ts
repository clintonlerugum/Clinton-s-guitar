import { NextResponse } from 'next/server'
import { parseCartCookieHeader, maxCartQuantity } from '../../../../lib/cart'
import { prisma } from '../../../../lib/prisma'

type CartAction = 'increase' | 'decrease' | 'remove'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (Object.keys(body).some((key) => key !== 'productId' && key !== 'action')) {
    return NextResponse.json({ error: 'Only one-item cart actions are supported' }, { status: 400 })
  }

  const { productId, action } = body as { productId?: unknown; action?: unknown }
  if (typeof productId !== 'string' || productId.trim().length === 0) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  }
  if (action !== 'increase' && action !== 'decrease' && action !== 'remove') {
    return NextResponse.json({ error: 'Invalid cart action' }, { status: 400 })
  }

  const cart = parseCartCookieHeader(req.headers.get('cookie') || '')
  if (!cart) return NextResponse.json({ error: 'Cart data is invalid' }, { status: 400 })

  const itemIndex = cart.findIndex((item) => item.productId === productId)
  if (itemIndex === -1) return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })

  if (action === 'remove') {
    cart.splice(itemIndex, 1)
  } else {
    const item = cart[itemIndex]
    if (action === 'increase') {
      if (item.quantity >= maxCartQuantity) {
        return NextResponse.json({ error: 'Cart quantity is too large' }, { status: 400 })
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, published: true, fullPdf: { not: null } },
        select: { id: true }
      })
      if (!product) return NextResponse.json({ error: 'Product is not available' }, { status: 404 })
      item.quantity += 1
    } else if (item.quantity <= 1) {
      return NextResponse.json({ error: 'Quantity cannot be less than one; remove the item instead' }, { status: 400 })
    } else {
      item.quantity -= 1
    }
  }

  const response = NextResponse.json({ ok: true, cart })
  response.cookies.set('cart', JSON.stringify(cart), { path: '/', httpOnly: false })
  return response
}
