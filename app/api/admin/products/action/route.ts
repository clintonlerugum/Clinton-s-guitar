import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../../../lib/auth'

export async function POST(req: Request) {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data || data.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const action = form.get('_action') as string | null
  const id = form.get('id') as string | null
  if (!action || !id) return NextResponse.json({ error: 'Missing' }, { status: 400 })

  if (action === 'delete') {
    await prisma.product.delete({ where: { id } })
  } else if (action === 'toggle') {
    const p = await prisma.product.findUnique({ where: { id } })
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!p.published && !p.fullPdf) {
      return NextResponse.json({ error: 'Upload the protected full PDF before publishing this tab.' }, { status: 400 })
    }
    await prisma.product.update({ where: { id }, data: { published: !p.published } })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Redirect back to products page instead of returning JSON
  return NextResponse.redirect(new URL('/admin/products', req.url))
}
