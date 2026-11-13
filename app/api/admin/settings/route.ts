import { NextResponse } from 'next/server'
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth'
import { getStoreSettings, isMpesaConfigured, type StoreSettings } from '../../../../lib/store-settings'
import { prisma } from '../../../../lib/prisma'
import { saveProductUpload } from '../../../../lib/product-uploads'

const fieldsBySection: Record<string, string[]> = {
  store: ['storeName', 'storeEmail', 'supportContact', 'storeDescription', 'storeLogo', 'youtubeUrl', 'tiktokUrl', 'instagramUrl', 'facebookUrl'],
  payment: ['mpesaEnabled', 'paymentInstructions'],
  orders: [],
  downloads: ['maxDownloadAttempts', 'downloadExpiryDays', 'allowRedownload'],
  notifications: [],
  storefront: ['announcement', 'announcementVisible', 'showLatest', 'showFeatured', 'showCategories', 'showBenefits', 'showHowItWorks', 'footerContact'],
  general: ['timezone', 'dateFormat', 'maintenanceMode'],
}

function isAdmin() {
  const data = verifyToken(getTokenFromCookies())
  return Boolean(data && typeof data === 'object' && 'role' in data && data.role === 'ADMIN')
}

function validOptionalUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 500) return false
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function validate(section: string, input: unknown, current: StoreSettings): { values?: StoreSettings; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Invalid settings payload.' }
  const submitted = input as Record<string, unknown>
  const allowedFields = fieldsBySection[section]
  if (!allowedFields) return { error: 'Unknown settings section.' }
  if (Object.keys(submitted).some((key) => !allowedFields.includes(key))) return { error: 'This section contains unsupported settings.' }

  const values: Record<string, unknown> = { ...current }
  const textLimits: Record<string, number> = {
    storeName: 100, storeEmail: 254, supportContact: 120, storeDescription: 1000, storeLogo: 500,
    paymentInstructions: 1000, announcement: 300, footerContact: 300,
    youtubeUrl: 500, tiktokUrl: 500, instagramUrl: 500, facebookUrl: 500,
  }
  for (const [key, value] of Object.entries(submitted)) {
    if (key in textLimits) {
      if (typeof value !== 'string' || value.trim().length > textLimits[key]) return { error: `Invalid ${key} value.` }
      const cleanValue = value.trim()
      if (key === 'storeEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) return { error: 'Enter a valid store email address.' }
      if (key === 'storeLogo' && !validOptionalUrl(cleanValue) && (!cleanValue.startsWith('/') || cleanValue.startsWith('//') || cleanValue.includes('\\'))) {
        return { error: 'Logo must be an HTTPS URL or a local site path.' }
      }
      if (key.endsWith('Url') && !validOptionalUrl(cleanValue)) return { error: `${key} must be an HTTPS URL.` }
      values[key] = cleanValue
      continue
    }
    if (key === 'maxDownloadAttempts' || key === 'downloadExpiryDays') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > (key === 'maxDownloadAttempts' ? 100 : 3650)) {
        return { error: `${key === 'maxDownloadAttempts' ? 'Maximum download attempts' : 'Download expiry days'} must be between 0 and ${key === 'maxDownloadAttempts' ? 100 : 3650}.` }
      }
      values[key] = value
      continue
    }
    if (key === 'timezone') {
      if (value !== 'Africa/Nairobi' && value !== 'UTC') return { error: 'Choose a supported time zone.' }
      values.timezone = value
      continue
    }
    if (key === 'dateFormat') {
      if (value !== 'en-KE' && value !== 'en-GB' && value !== 'en-US') return { error: 'Choose a supported date format.' }
      values.dateFormat = value
      continue
    }
    if (typeof value !== 'boolean') return { error: `Invalid ${key} value.` }
    values[key] = value
  }

  if (section === 'notifications' && Object.values(submitted).some(Boolean)) {
    return { error: 'Email notifications are unavailable because no email delivery service is configured.' }
  }
  return { values: values as StoreSettings }
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = await getStoreSettings()
  return NextResponse.json({
    settings,
    status: {
      mpesaConfigured: isMpesaConfigured(),
      mpesaTill: process.env.MPESA_PARTY_B || process.env.MPESA_SHORTCODE || '',
      emailConfigured: false,
      paymentSecretsStoredInEnvironment: true,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let payload: unknown
  let logoFile: FormDataEntryValue | null = null
  try {
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await request.formData()
      payload = { section: form.get('section'), values: JSON.parse(String(form.get('values') || '{}')) }
      logoFile = form.get('storeLogoFile')
    } else {
      payload = await request.json()
    }
  } catch {
    return NextResponse.json({ error: 'Request must contain valid settings data.' }, { status: 400 })
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid settings request.' }, { status: 400 })
  }
  const { section, values } = payload as { section?: unknown; values?: unknown }
  if (typeof section !== 'string') return NextResponse.json({ error: 'Settings section is required.' }, { status: 400 })
  const current = await getStoreSettings()
  const result = validate(section, values, current)
  if (!result.values) return NextResponse.json({ error: result.error }, { status: 400 })

  try {
    const savedValues = { ...result.values }
    if (logoFile instanceof File && logoFile.size > 0) {
      const logoUrl = await saveProductUpload(logoFile, 'storeLogo')
      if (logoUrl) savedValues.storeLogo = logoUrl
    }
    await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', values: savedValues },
      update: { values: savedValues },
    })
    return NextResponse.json({ settings: savedValues })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save settings.'
    console.error('Unable to persist admin store settings.', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
