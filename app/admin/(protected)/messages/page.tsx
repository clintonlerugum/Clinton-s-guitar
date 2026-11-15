import Link from 'next/link'
import { prisma } from '../../../../lib/prisma'
import { getStoreSettings } from '../../../../lib/store-settings'
import { formatStoreDate } from '../../../../lib/format-store-date'
import AdminMessageActions from '../../../../components/AdminMessageActions'
import { AdminMessagesAutoRefresh } from '../../../../components/AdminMessageNotifications'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25
const filters = [
  { label: 'All Messages', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Read', value: 'READ' },
]

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[]; q?: string | string[]; page?: string | string[] }
}) {
  const settings = await getStoreSettings()
  const requestedStatus = firstParam(searchParams?.status)
  const status = requestedStatus === 'READ' || requestedStatus === 'UNREAD' ? requestedStatus : 'ALL'
  const query = (firstParam(searchParams?.q) || '').trim().slice(0, 100)
  const requestedPage = Number.parseInt(firstParam(searchParams?.page) || '1', 10)
  const searchFilter = query
    ? { OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { email: { contains: query, mode: 'insensitive' as const } },
      { subject: { contains: query, mode: 'insensitive' as const } },
    ] }
    : {}
  const where = {
    ...(status !== 'ALL' ? { status } : {}),
    ...searchFilter,
  }
  const [allCount, unreadCount, readCount, filteredCount] = await Promise.all([
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { status: 'UNREAD' } }),
    prisma.contactMessage.count({ where: { status: 'READ' } }),
    prisma.contactMessage.count({ where }),
  ])
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE))
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), pageCount) : 1
  const messages = await prisma.contactMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, name: true, email: true, subject: true, message: true, status: true, createdAt: true },
  })

  function filterHref(filterStatus: string) {
    const params = new URLSearchParams()
    if (filterStatus !== 'ALL') params.set('status', filterStatus)
    if (query) params.set('q', query)
    const search = params.toString()
    return `/admin/messages${search ? `?${search}` : ''}`
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (query) params.set('q', query)
    params.set('page', String(nextPage))
    return `/admin/messages?${params.toString()}`
  }

  return (
    <section className="admin-management-page admin-message-page">
      <AdminMessagesAutoRefresh />
      <header className="admin-management-heading">
        <div>
          <span className="admin-eyebrow">Customer care</span>
          <h1>Messages</h1>
          <p>Enquiries sent through the public contact form.</p>
        </div>
      </header>

      <div className="admin-message-summary" aria-label="Message counts">
        <div><span>All messages</span><strong>{allCount.toLocaleString('en-KE')}</strong></div>
        <div><span>Unread</span><strong>{unreadCount.toLocaleString('en-KE')}</strong></div>
        <div><span>Read</span><strong>{readCount.toLocaleString('en-KE')}</strong></div>
      </div>

      <div className="admin-message-toolbar">
        <nav className="admin-filter-tabs" aria-label="Filter messages">
          {filters.map((filter) => (
            <Link
              className={status === filter.value ? 'is-active' : ''}
              href={filterHref(filter.value)}
              key={filter.value}
              aria-current={status === filter.value ? 'page' : undefined}
            >
              {filter.label}
              {filter.value === 'UNREAD' && unreadCount > 0 && <span className="admin-message-filter-count">{unreadCount}</span>}
            </Link>
          ))}
        </nav>
        <form action="/admin/messages" method="get" className="admin-message-search">
          {status !== 'ALL' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="admin-message-query">Search messages</label>
          <div>
            <input id="admin-message-query" name="q" type="search" defaultValue={query} maxLength={100} placeholder="Sender, email or subject" />
            <button type="submit">Search</button>
          </div>
        </form>
      </div>

      {messages.length === 0 ? (
        <div className="admin-message-empty">
          <span className="admin-inbox-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg>
          </span>
          <h2>{allCount === 0 ? 'Your inbox is ready' : 'No messages found'}</h2>
          <p>{allCount === 0 ? 'New enquiries submitted through the Contact form will appear here.' : 'Try a different search or message filter.'}</p>
        </div>
      ) : (
        <>
          <p className="admin-message-results">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredCount)} of {filteredCount.toLocaleString('en-KE')} messages
          </p>
          <ul className="admin-message-list">
            {messages.map((message) => (
              <li className={`admin-message-card${message.status === 'UNREAD' ? ' is-unread' : ''}`} key={message.id}>
                <div className="admin-message-card-heading">
                  <div className="admin-message-card-sender">
                    <span className="admin-message-unread-dot" aria-hidden="true" />
                    <div>
                      <Link href={`/admin/messages/${encodeURIComponent(message.id)}`}>{message.subject}</Link>
                      <span>{message.name} · {message.email}</span>
                    </div>
                  </div>
                  <span className={`admin-message-status is-${message.status.toLowerCase()}`}>{message.status === 'UNREAD' ? 'Unread' : 'Read'}</span>
                </div>
                <p className="admin-message-preview">{message.message}</p>
                <div className="admin-message-card-footer">
                  <time dateTime={message.createdAt.toISOString()}>{formatStoreDate(message.createdAt, settings, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
                  <Link className="admin-message-open-link" href={`/admin/messages/${encodeURIComponent(message.id)}`}>Open message <span aria-hidden="true">→</span></Link>
                  <AdminMessageActions messageId={message.id} initialStatus={message.status === 'UNREAD' ? 'UNREAD' : 'READ'} />
                </div>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav className="admin-message-pagination" aria-label="Message pages">
              {page > 1 && <Link href={pageHref(page - 1)}>← Newer</Link>}
              <span>Page {page} of {pageCount}</span>
              {page < pageCount && <Link href={pageHref(page + 1)}>Older →</Link>}
            </nav>
          )}
        </>
      )}
    </section>
  )
}
