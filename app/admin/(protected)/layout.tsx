import { ReactNode } from 'react'
import { getTokenFromCookies, verifyToken } from '../../../lib/auth'
import AdminNav from '../../../components/AdminNav'

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const token = getTokenFromCookies()
  const data: any = verifyToken(token)

  if (!data || data.role !== 'ADMIN') {
    return (
      <div className="container py-12">
        <div className="bg-gray-900 p-6 rounded">
          You must be an administrator to access this area. Please <a href="/admin/login" className="text-accent">log in</a>.
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}