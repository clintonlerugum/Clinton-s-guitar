import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { readProtectedFile, readProtectedPdf } from '../../../../lib/product-uploads'
import { pdfDownloadHeaders, productDownloadStem, zipDownloadHeaders } from '../../../../lib/download-filename'
import { createZipArchive } from '../../../../lib/zip'
import { getStoreSettings } from '../../../../lib/store-settings'

export async function GET(_req: Request, { params }: any) {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)
  if (!data || typeof data === 'string' || typeof data.id !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const productId = params.productId
  const paidOrder = await prisma.order.findFirst({
    where: {
      userId: data.id,
      status: 'PAID',
      items: { some: { productId } }
    },
    orderBy: { createdAt: 'desc' },
    include: { payment: { select: { updatedAt: true } } },
  })
  if (!paidOrder) return NextResponse.json({ error: 'Payment not confirmed' }, { status: 403 })

  const settings = await getStoreSettings()
  if (settings.downloadExpiryDays > 0) {
    const expiresAt = (paidOrder.payment?.updatedAt ?? paidOrder.createdAt).getTime() + settings.downloadExpiryDays * 24 * 60 * 60 * 1000
    if (Date.now() >= expiresAt) return NextResponse.json({ error: 'Download access has expired.' }, { status: 403 })
  }

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
    const download = new NextResponse(archive, { headers: zipDownloadHeaders(product.title, product.artist) })
    const attempt = await consumeDownloadAttempt(data.id, productId, settings.maxDownloadAttempts, settings.allowRedownload)
    if (!attempt) return NextResponse.json({ error: settings.allowRedownload ? 'Maximum download attempts reached.' : 'Redownloads are disabled for this purchase.' }, { status: settings.allowRedownload ? 429 : 403 })
    return download
  }

  const download = new NextResponse(file, { headers: pdfDownloadHeaders(product.title, product.artist) })
  const attempt = await consumeDownloadAttempt(data.id, productId, settings.maxDownloadAttempts, settings.allowRedownload)
  if (!attempt) return NextResponse.json({ error: settings.allowRedownload ? 'Maximum download attempts reached.' : 'Redownloads are disabled for this purchase.' }, { status: settings.allowRedownload ? 429 : 403 })
  return download
}

async function consumeDownloadAttempt(userId: string, productId: string, maximum: number, allowRedownload: boolean) {
  await prisma.download.upsert({
    where: { user_product_download: { userId, productId } },
    create: { userId, productId },
    update: {},
  })
  return (await prisma.download.updateMany({
    where: {
      userId,
      productId,
      ...(allowRedownload ? maximum > 0 ? { attempts: { lt: maximum } } : {} : { attempts: 0 }),
    },
    data: { attempts: { increment: 1 } },
  })).count === 1
}
