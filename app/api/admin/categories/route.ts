import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { normalizeProductSlug, saveProductUpload } from '../../../../lib/product-uploads'

function isAdmin() {
  const token = getTokenFromCookies()
  const data = verifyToken(token)
  return Boolean(data && typeof data === 'object' && 'role' in data && data.role === 'ADMIN')
}

function redirectToCategories(request: Request) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: new URL('/admin/categories', request.url).toString() },
  })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await request.formData()
    const action = String(form.get('_action') ?? '')
    const id = String(form.get('id') ?? '').trim()

    if (action === 'delete' || action === 'toggle') {
      if (!id) return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 })
      if (action === 'delete') {
        await prisma.category.delete({ where: { id } })
      } else {
        const category = await prisma.category.findUnique({ where: { id }, select: { active: true } })
        if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
        await prisma.category.update({ where: { id }, data: { active: !category.active } })
      }
      return redirectToCategories(request)
    }

    if (action !== 'create' && action !== 'update') {
      return NextResponse.json({ error: 'Unknown category action.' }, { status: 400 })
    }

    const name = String(form.get('name') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const slug = normalizeProductSlug(String(form.get('slug') || name))
    if (!name || !description || !slug) {
      return NextResponse.json({ error: 'Category name and description are required.' }, { status: 400 })
    }

    const duplicate = await prisma.category.findFirst({
      where: { slug, ...(action === 'update' ? { NOT: { id } } : {}) },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 })

    const imageUpload = form.get('image')
    const image = await saveProductUpload(imageUpload, 'categoryImage')

    if (action === 'create') {
      if (!image) return NextResponse.json({ error: 'Upload an image for this category.' }, { status: 400 })
      await prisma.category.create({ data: { name, slug, description, image, active: form.get('active') === 'on' } })
    } else {
      if (!id) return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 })
      await prisma.category.update({
        where: { id },
        data: { name, slug, description, ...(image ? { image } : {}) },
      })
    }

    return redirectToCategories(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save the category.'
    const status = message.startsWith('Unsupported ') || message.includes('maximum file size') || message.startsWith('Supabase Storage upload failed with HTTP 4')
      ? 400
      : 500
    return NextResponse.json({ error: status === 400 ? message : 'Unable to save the category. Check the category details and try again.' }, { status })
  }
}
