import { ReactNode } from 'react'
import AdminNav from '../../components/AdminNav'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      {children}
    </div>
  )
}
