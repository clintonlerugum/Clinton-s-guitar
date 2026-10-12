import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { readProtectedPdf } from '../../../../lib/product-uploads'
import { pdfDownloadHeaders } from '../../../../lib/download-filename'

export async function GET(_req: Request, { params }: any) {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = params.productId
  const hasPaidOrder = await prisma.order.findFirst({
    where: {
      userId: data.id,
      status: 'PAID',
      items: { some: { productId } }
    }
  })
  if (!hasPaidOrder) return NextResponse.json({ error: 'Payment not confirmed' }, { status: 403 })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || !product.fullPdf) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const file = await readProtectedPdf(product.fullPdf)
  if (!file) return NextResponse.json({ error: 'File missing' }, { status: 404 })
  return new NextResponse(file, { headers: pdfDownloadHeaders(product.title, product.artist) })
}
