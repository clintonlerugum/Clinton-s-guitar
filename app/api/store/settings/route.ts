import { NextResponse } from 'next/server'
import { getStoreSettings } from '../../../../lib/store-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getStoreSettings()
  return NextResponse.json({
    storeName: settings.storeName,
    storeEmail: settings.storeEmail,
    storeDescription: settings.storeDescription,
    storeLogo: settings.storeLogo,
    supportContact: settings.supportContact,
    footerContact: settings.footerContact,
    youtubeUrl: settings.youtubeUrl,
    tiktokUrl: settings.tiktokUrl,
    instagramUrl: settings.instagramUrl,
    facebookUrl: settings.facebookUrl,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
