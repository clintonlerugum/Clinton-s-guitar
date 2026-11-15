import Link from 'next/link'
import { prisma } from '../../../../../lib/prisma'
import { getStoreSettings } from '../../../../../lib/store-settings'
import { formatStoreDate } from '../../../../../lib/format-store-date'
import AdminMessageActions from '../../../../../components/AdminMessageActions'

export const dynamic = 'force-dynamic'

export default async function AdminMessageDetailPage({ params }: { params: { id: string } }) {
  let message = await prisma.contactMessage.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, subject: true, message: true, status: true, createdAt: true },
  })
  if (!message) {
    return (
      <section className="admin-management-page">
        <p className="admin-message-empty">This message may have been deleted.</p>
        <Link href="/admin/messages" className="admin-view-link">← Back to Messages</Link>
      </section>
    )
  }

  if (message.status === 'UNREAD') {
    const updated = await prisma.contactMessage.update({
      where: { id: message.id },
      data: { status: 'READ' },
      select: { status: true },
    })
    message = { ...message, status: updated.status }
  }
  const settings = await getStoreSettings()
  const replySubject = `Re: ${message.subject}`

  return (
    <section className="admin-management-page admin-message-detail-page">
      <header className="admin-management-heading">
        <div>
          <Link href="/admin/messages" className="admin-view-link">← All Messages</Link>
          <span className="admin-eyebrow admin-message-detail-eyebrow">Contact enquiry</span>
          <h1>{message.subject}</h1>
          <p>Received {formatStoreDate(message.createdAt, settings, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
      </header>

      <article className="admin-message-detail-card">
        <div className="admin-message-detail-sender">
          <span className="admin-message-avatar" aria-hidden="true">{message.name.trim().slice(0, 1).toUpperCase() || '?'}</span>
          <div>
            <strong>{message.name}</strong>
            <a href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a>
          </div>
          <span className={`admin-message-status is-${message.status.toLowerCase()}`}>{message.status === 'UNREAD' ? 'Unread' : 'Read'}</span>
        </div>
        <div className="admin-message-body">{message.message}</div>
        <div className="admin-message-detail-actions">
          <a className="admin-message-reply-button" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(replySubject)}`}>
            Reply in email app <span aria-hidden="true">↗</span>
          </a>
          <AdminMessageActions messageId={message.id} initialStatus={message.status === 'UNREAD' ? 'UNREAD' : 'READ'} returnToInbox />
        </div>
        <p className="admin-message-reply-note">Email sending is not configured in the website. This opens a reply in your default email app; it does not send automatically.</p>
      </article>
    </section>
  )
}
