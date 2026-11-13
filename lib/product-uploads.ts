import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const uploadTypes = {
  coverImage: {
    mimeTypes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' },
    maxBytes: 8 * 1024 * 1024,
    public: true
  },
  categoryImage: {
    mimeTypes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' },
    maxBytes: 8 * 1024 * 1024,
    public: true
  },
  storeLogo: {
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
  },
  fullMuseScore: {
    mimeTypes: {
      'application/zip': 'mscz',
      'application/x-zip-compressed': 'mscz',
      'application/octet-stream': 'mscz',
      'application/vnd.musescore.score': 'mscz',
      'application/xml': 'mscx',
      'text/xml': 'mscx'
    },
    maxBytes: 4 * 1024 * 1024,
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
  let extension: string | undefined
  if (field === 'fullMuseScore') {
    const fileExtension = /\.(mscz|mscx)$/i.exec(value.name)?.[1]?.toLowerCase()
    if (!fileExtension) throw new Error('Unsupported MuseScore file. Upload an .mscz or .mscx file.')
    extension = fileExtension
  } else {
    extension = config.mimeTypes[value.type as keyof typeof config.mimeTypes]
  }
  if (!extension) throw new Error(`Unsupported ${field} file type.`)
  if (value.size > config.maxBytes) throw new Error(`${field} exceeds the maximum file size.`)

  const fileBytes = Buffer.from(await value.arrayBuffer())
  if (field === 'fullMuseScore') {
    if (extension === 'mscz' && (fileBytes.length < 4 || fileBytes.toString('ascii', 0, 2) !== 'PK')) {
      throw new Error('The .mscz file is not a valid MuseScore score archive.')
    }
    if (extension === 'mscx') {
      const xmlStart = fileBytes.subarray(0, 4096).toString('utf8').replace(/^\uFEFF/, '').trimStart()
      if (!/^<\?xml[\s\S]*?<museScore\b|^<museScore\b/i.test(xmlStart)) {
        throw new Error('The .mscx file is not a valid MuseScore score document.')
      }
    }
  }

  const filename = `${randomUUID()}.${extension}`
  const { baseUrl, secretKey } = getStorageConfig()
  const bucket = config.public ? publicBucket : protectedBucket
  const objectPath = `${field}/${filename}`
  const contentType = field === 'fullMuseScore'
    ? extension === 'mscz' ? 'application/zip' : 'application/xml'
    : value.type
  const response = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': contentType,
      'x-upsert': 'false'
    },
    body: fileBytes,
    signal: AbortSignal.timeout(15_000)
  })
  if (!response.ok) {
    let detail = ''
    try {
      const responseBody = await response.json() as Record<string, unknown>
      const reason = responseBody.message ?? responseBody.error ?? responseBody.msg
      if (typeof reason === 'string') detail = `: ${reason.replace(/\s+/g, ' ').slice(0, 200)}`
    } catch {
      // Keep the response generic if Storage did not return a readable JSON error.
    }
    throw new Error(`Supabase Storage upload failed with HTTP ${response.status}${detail}.`)
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

export async function readProtectedFile(filePath: string) {
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

export async function readProtectedPdf(filePath: string) {
  return readProtectedFile(filePath)
}

export function normalizeProductSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
