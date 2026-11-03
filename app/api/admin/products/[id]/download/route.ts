import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'
import { readProtectedFile, readProtectedPdf } from '../../../../../../lib/product-uploads'
import { pdfDownloadHeaders, productDownloadStem, zipDownloadHeaders } from '../../../../../../lib/download-filename'
import { createZipArchive } from '../../../../../../lib/zip'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = getTokenFromCookies()
  const auth: any = verifyToken(token)
  if (!auth || typeof auth === 'string' || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { title: true, artist: true, fullPdf: true, fullMuseScore: true }
  })
  if (!product || !product.fullPdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  const file = await readProtectedPdf(product.fullPdf)
  if (!file) return NextResponse.json({ error: 'PDF file is missing' }, { status: 404 })

  if (product.fullMuseScore) {
    const museScoreFile = await readProtectedFile(product.fullMuseScore)
    if (!museScoreFile) return NextResponse.json({ error: 'MuseScore file is missing' }, { status: 404 })

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
