import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { readProtectedPdf } from '../../../../../../lib/product-uploads'
import { pdfDownloadHeaders } from '../../../../../../lib/download-filename'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = getTokenFromCookies()
  const auth: any = verifyToken(token)
  if (!auth || typeof auth === 'string' || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { title: true, artist: true, fullPdf: true }
  })
  if (!product || !product.fullPdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  const file = await readProtectedPdf(product.fullPdf)
  if (!file) return NextResponse.json({ error: 'PDF file is missing' }, { status: 404 })

  return new NextResponse(file, { headers: pdfDownloadHeaders(product.title, product.artist) })
}
