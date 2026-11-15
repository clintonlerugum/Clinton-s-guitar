import { getTokenFromCookies, verifyToken } from './auth'

export function isAdminRequest() {
  const data = verifyToken(getTokenFromCookies())
  return Boolean(data && typeof data === 'object' && 'role' in data && data.role === 'ADMIN')
}
