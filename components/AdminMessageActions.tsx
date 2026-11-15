'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type MessageStatus = 'READ' | 'UNREAD'

export default function AdminMessageActions({
  messageId,
  initialStatus,
  returnToInbox = false,
}: {
  messageId: string
  initialStatus: MessageStatus
  returnToInbox?: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function updateMessage(method: 'PATCH' | 'DELETE') {
    if (method === 'DELETE' && !window.confirm('Delete this message? This cannot be undone.')) return
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/messages/${encodeURIComponent(messageId)}`, {
        method,
        headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PATCH' ? JSON.stringify({ status: status === 'UNREAD' ? 'READ' : 'UNREAD' }) : undefined,
      })
      const result = await response.json() as { error?: string; status?: MessageStatus }
      if (!response.ok) throw new Error(result.error || 'Unable to update this message.')
      if (method === 'DELETE') {
        if (returnToInbox) router.push('/admin/messages')
        else router.refresh()
        return
      }
      if (result.status !== 'READ' && result.status !== 'UNREAD') throw new Error('The server returned an invalid message status.')
      setStatus(result.status)
      router.refresh()
    } catch (actionError) {
      console.error('Admin message action failed.', actionError)
      setError(actionError instanceof Error ? actionError.message : 'Unable to update this message.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-message-actions">
      <button type="button" className="admin-message-action-button" disabled={pending} onClick={() => updateMessage('PATCH')}>
        {status === 'UNREAD' ? 'Mark as read' : 'Mark as unread'}
      </button>
      <button type="button" className="admin-message-action-button is-danger" disabled={pending} onClick={() => updateMessage('DELETE')}>
        Delete
      </button>
      {error && <p className="admin-message-action-error" role="alert">{error}</p>}
    </div>
  )
}
