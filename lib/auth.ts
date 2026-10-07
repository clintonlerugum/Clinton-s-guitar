import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET

export function getAuthBaseUrl(requestUrl: string) {
  const configuredBaseUrl = process.env.AUTH_BASE_URL
  const baseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(requestUrl)

  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
    throw new Error('AUTH_BASE_URL must be an HTTP(S) URL without credentials.')
  }

  return baseUrl.origin
}

export function signToken(payload: object) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET must be configured before signing tokens.')
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token?: string | null) {
  if (!token || !JWT_SECRET) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (e) {
    return null
  }
}

export function getTokenFromCookies() {
  try {
    const c = cookies().get('token')
    return c?.value ?? null
  } catch (e) {
    return null
  }
}
