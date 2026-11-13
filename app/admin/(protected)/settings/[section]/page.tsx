import Link from 'next/link'
import { getTokenFromCookies, verifyToken } from '../../../../../lib/auth'
import { getStoreSettings } from '../../../../../lib/store-settings'
import { prisma } from '../../../../../lib/prisma'
import AdminSettingsEditor from '../../../../../components/AdminSettingsEditor'
import AdminSecuritySettings from '../../../../../components/AdminSecuritySettings'

export const dynamic = 'force-dynamic'

const editableSections = new Set(['store', 'orders', 'notifications', 'storefront', 'general'])

export default async function AdminSettingsSectionPage({ params }: { params: { section: string } }) {
  const { section } = params
  if (section === 'security') {
    const identity = verifyToken(getTokenFromCookies())
    const userId = identity && typeof identity !== 'string' && typeof identity.id === 'string' ? identity.id : null
    if (!userId) return <p className="admin-settings-alert">Admin account could not be verified.</p>
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } })
    if (!user || user.role !== 'ADMIN') return <p className="admin-settings-alert">Admin account could not be verified.</p>
    return (
      <>
        <Link href="/admin/settings" className="admin-settings-back">← All settings</Link>
        <AdminSecuritySettings email={user.email} />
      </>
    )
  }
  if (!editableSections.has(section)) {
    return <p className="admin-settings-alert">Settings section not found. <Link href="/admin/settings">Return to Settings Centre</Link>.</p>
  }
  const settings = await getStoreSettings()
  const status = {
    emailConfigured: false,
  }

  return (
    <>
      <Link href="/admin/settings" className="admin-settings-back">← All settings</Link>
      <AdminSettingsEditor section={section} initialSettings={settings} status={status} />
    </>
  )
}
