import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { readProtectedFile, readProtectedPdf } from '../../../../lib/product-uploads'
import { pdfDownloadHeaders, productDownloadStem, zipDownloadHeaders } from '../../../../lib/download-filename'
import { createZipArchive } from '../../../../lib/zip'

export async function GET(_req: Request, { params }: any) {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data || typeof data === 'string' || typeof data.id !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (product.fullMuseScore) {
    const museScoreFile = await readProtectedFile(product.fullMuseScore)
    if (!museScoreFile) return NextResponse.json({ error: 'MuseScore file missing' }, { status: 404 })

    const stem = productDownloadStem(product.title, product.artist)
    const extension = product.fullMuseScore.toLowerCase().endsWith('.mscx') ? 'mscx' : 'mscz'
    const archive = createZipArchive([
      { name: `${stem}.pdf`, contents: file },
      { name: `${stem}.${extension}`, contents: museScoreFile }
    ])
    return new NextResponse(archive, { headers: zipDownloadHeaders(product.title, product.artist) })
  }

  return new NextResponse(file, { headers: pdfDownloadHeaders(product.title, product.artist) })
}
