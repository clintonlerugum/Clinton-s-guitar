import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { maxCartQuantity, parseCartCookieHeader } from '../../../../lib/cart'

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

  const { productId, quantity } = body as { productId?: unknown; quantity?: unknown }
  if (typeof productId !== 'string' || productId.trim().length === 0) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  }
  if (quantity !== undefined && (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > maxCartQuantity)) {
    return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
  }

  const prod = await prisma.product.findFirst({ where: { id: productId, published: true, fullPdf: { not: null } } })
  if (!prod) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const cart = parseCartCookieHeader(req.headers.get('cookie') || '')
  if (!cart) return NextResponse.json({ error: 'Cart data is invalid' }, { status: 400 })
  const amountToAdd = quantity ?? 1

  const existing = cart.find((item) => item.productId === productId)
  if (existing && existing.quantity + amountToAdd > maxCartQuantity) {
    return NextResponse.json({ error: 'Cart quantity is too large' }, { status: 400 })
  }
  if (existing) existing.quantity += amountToAdd
  else cart.push({ productId, quantity: amountToAdd })

  const res = NextResponse.json({ ok: true, cart })
  res.cookies.set('cart', JSON.stringify(cart), { path: '/', httpOnly: false })
  return res
}
