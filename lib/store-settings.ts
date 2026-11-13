import { prisma } from './prisma'

export const defaultStoreSettings = {
  storeName: "Clinton's Guitar",
  storeEmail: 'lerugumclintonguitars@gmail.com',
  supportContact: '',
  storeDescription: 'Premium tabs for players who want to keep learning.',
  storeLogo: '/logo.svg',
  youtubeUrl: '',
  tiktokUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  mpesaEnabled: true,
  paymentInstructions: 'Enter the phone number registered to your M-Pesa account at checkout.',
  confirmationEmails: false,
  paymentEmails: false,
  downloadEmails: false,
  cancellationEmails: false,
  announcement: '',
  announcementVisible: false,
  showLatest: true,
  showFeatured: true,
  showCategories: true,
  showBenefits: true,
  showHowItWorks: true,
  footerContact: '',
  maxDownloadAttempts: 0,
  downloadExpiryDays: 0,
  allowRedownload: true,
  timezone: 'Africa/Nairobi',
  dateFormat: 'en-KE',
  maintenanceMode: false,
} as const

export type StoreSettings = {
  [K in keyof typeof defaultStoreSettings]: (typeof defaultStoreSettings)[K] extends boolean
    ? boolean
    : (typeof defaultStoreSettings)[K] extends number
      ? number
      : string
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const record = await prisma.storeSettings.findUnique({ where: { id: 'default' } })
  if (!record || typeof record.values !== 'object' || record.values === null || Array.isArray(record.values)) {
    return { ...defaultStoreSettings }
  }
  return { ...defaultStoreSettings, ...record.values } as StoreSettings
}

export function isMpesaConfigured() {
  const mode = process.env.PAYMENT_MODE?.trim().toLowerCase()
  return Boolean(
    (mode === 'live' || mode === 'mpesa') &&
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_CALLBACK_URL
  )
}
