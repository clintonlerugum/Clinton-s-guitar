import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const uploadTypes = {
  coverImage: {
    mimeTypes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' },
    maxBytes: 8 * 1024 * 1024,
    public: true
  },
  previewPdf: {
    mimeTypes: { 'application/pdf': 'pdf' },
    maxBytes: 20 * 1024 * 1024,
    public: true
  },
  previewMedia: {
    mimeTypes: {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/webm': 'weba',
      'video/mp4': 'mp4',
      'video/webm': 'webm'
    },
    maxBytes: 100 * 1024 * 1024,
    public: true
  },
  fullPdf: {
    mimeTypes: { 'application/pdf': 'pdf' },
    maxBytes: 100 * 1024 * 1024,
    public: false
  }
} as const

type UploadField = keyof typeof uploadTypes
const publicBucket = 'clintons-guitar-public'
const protectedBucket = 'clintons-guitar-private'

function getStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) {
    throw new Error('Supabase Storage requires SUPABASE_URL and SUPABASE_SECRET_KEY.')
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY) {
    throw new Error('The Supabase secret key must not use a NEXT_PUBLIC_ variable.')
  }

  const baseUrl = new URL(supabaseUrl)
  if (baseUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.')
  return { baseUrl: baseUrl.origin, secretKey }
}

function encodeObjectPath(objectPath: string) {
  return objectPath.split('/').map(encodeURIComponent).join('/')
}

function getPublicObjectUrl(baseUrl: string, objectPath: string) {
  return `${baseUrl}/storage/v1/object/public/${publicBucket}/${encodeObjectPath(objectPath)}`
}

export async function saveProductUpload(value: FormDataEntryValue | null, field: UploadField) {
  if (!(value instanceof File) || value.size === 0) return null

  const config = uploadTypes[field]
  const extension = config.mimeTypes[value.type as keyof typeof config.mimeTypes]
  if (!extension) throw new Error(`Unsupported ${field} file type.`)
  if (value.size > config.maxBytes) throw new Error(`${field} exceeds the maximum file size.`)

  const filename = `${randomUUID()}.${extension}`
  const { baseUrl, secretKey } = getStorageConfig()
  const bucket = config.public ? publicBucket : protectedBucket
  const objectPath = `${field}/${filename}`
  const response = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': value.type,
      'x-upsert': 'false'
    },
    body: Buffer.from(await value.arrayBuffer()),
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) {
    throw new Error(`Supabase Storage upload failed with HTTP ${response.status}.`)
  }

  return config.public
    ? getPublicObjectUrl(baseUrl, objectPath)
    : `supabase://${protectedBucket}/${objectPath}`
}

export function resolveProtectedPdfPath(filePath: string) {
  const protectedRoot = path.resolve(process.cwd(), process.env.STORAGE_ROOT || './storage', 'protected')
  const relativePath = filePath.replace(/^\//, '')
  const resolvedPath = path.resolve(process.cwd(), relativePath)
  if (!resolvedPath.startsWith(`${protectedRoot}${path.sep}`)) return null
  return resolvedPath
}

export async function readProtectedPdf(filePath: string) {
  if (filePath.startsWith('supabase://')) {
    const match = /^supabase:\/\/([^/]+)\/(.+)$/.exec(filePath)
    if (!match || match[1] !== protectedBucket || match[2].split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('Protected PDF storage reference is invalid.')
    }

    const { baseUrl, secretKey } = getStorageConfig()
    const response = await fetch(`${baseUrl}/storage/v1/object/authenticated/${protectedBucket}/${encodeObjectPath(match[2])}`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`
      },
      signal: AbortSignal.timeout(15_000)
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`Supabase Storage download failed with HTTP ${response.status}.`)
    return Buffer.from(await response.arrayBuffer())
  }

  const filepath = resolveProtectedPdfPath(filePath)
  if (!filepath) return null
  try {
    return await fs.readFile(filepath)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

export function normalizeProductSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}