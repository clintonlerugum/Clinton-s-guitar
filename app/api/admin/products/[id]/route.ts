import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../../../lib/auth'
import { normalizeProductSlug, saveProductUpload } from '../../../../../lib/product-uploads'

export async function POST(req: Request, { params }: any) {
  // Verify admin auth
  const token = getTokenFromCookies()
  const authData: any = verifyToken(token)
  if (!authData || authData.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = params.id
    const form = await req.formData()
    const existingProduct = await prisma.product.findUnique({ where: { id }, select: { id: true, difficulty: true, fullPdf: true } })
    if (!existingProduct) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    const title = String(form.get('title') ?? '').trim()
    const artist = String(form.get('artist') ?? '').trim()
    const slug = normalizeProductSlug(String(form.get('slug') || title))
    const priceValue = String(form.get('price') ?? '').trim()
    const price = Number(priceValue)
    const difficulty = String(form.get('difficulty') ?? '')
    const published = form.get('published') === 'on'
    const fullPdfUpload = form.get('fullPdf')
    if (!title || !artist || !slug || !/^\d+$/.test(priceValue) || !Number.isSafeInteger(price) || price < 1) {
      return NextResponse.json({ error: 'Title, artist, a valid slug, and a positive whole-number price are required.' }, { status: 400 })
    }
    if (published && !existingProduct.fullPdf && (!(fullPdfUpload instanceof File) || fullPdfUpload.size === 0)) {
      return NextResponse.json({ error: 'Upload the protected full PDF before publishing this tab.' }, { status: 400 })
    }
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(difficulty) && difficulty !== existingProduct.difficulty) {
      return NextResponse.json({ error: 'Select Beginner, Intermediate, or Advanced difficulty.' }, { status: 400 })
    }
    const duplicateSlug = await prisma.product.findFirst({ where: { slug, NOT: { id } } })
    if (duplicateSlug) return NextResponse.json({ error: 'A tab with this slug already exists.' }, { status: 409 })

    const [coverImage, previewPdf, previewMedia, fullPdf] = await Promise.all([
      saveProductUpload(form.get('coverImage'), 'coverImage'),
      saveProductUpload(form.get('previewPdf'), 'previewPdf'),
      saveProductUpload(form.get('previewMedia'), 'previewMedia'),
      saveProductUpload(form.get('fullPdf'), 'fullPdf')
    ])
    await prisma.product.update({
      where: { id },
      data: {
        title,
        artist,
        slug,
        description: String(form.get('description') ?? '').trim() || null,
        price,
        tuning: String(form.get('tuning') ?? '').trim() || null,
        difficulty,
        ...(coverImage && { coverImage }),
        ...(previewPdf && { previewPdf }),
        ...(previewMedia && { previewMedia }),
        ...(fullPdf && { fullPdf }),
        featured: form.get('featured') === 'on',
        published
      }
    })
    return new NextResponse(null, {
      status: 303,
      headers: { Location: new URL('/admin/products', req.url).toString() }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the tab.'
    const status = message.startsWith('Unsupported ') || message.includes('maximum file size') ? 400 : 500
    return NextResponse.json({ error: status === 400 ? message : 'Unable to update the tab. Check the product data and try again.' }, { status })
  }
}

export async function DELETE(req: Request, { params }: any) {
  // Verify admin auth
  const token = getTokenFromCookies()
  const authData: any = verifyToken(token)
  if (!authData || authData.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete this tab.' }, { status: 409 })
  }
}
