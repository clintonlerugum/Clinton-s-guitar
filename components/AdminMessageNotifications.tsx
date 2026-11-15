'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type UnreadResult = { count?: unknown; error?: string }

function useUnreadMessages() {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    async function refreshCount() {
      try {
        const response = await fetch('/api/admin/messages/unread-count', { cache: 'no-store' })
        const result = await response.json() as UnreadResult
        const unreadCount = result.count
        if (!response.ok || typeof unreadCount !== 'number' || !Number.isInteger(unreadCount) || unreadCount < 0) {
          throw new Error(result.error || 'Unable to load unread message count.')
        }
        if (active) {
          setCount(unreadCount)
          setFailed(false)
        }
      } catch (error) {
        console.error('Unable to refresh unread message count.', error)
        if (active) setFailed(true)
      }
    }

    void refreshCount()
    const interval = window.setInterval(refreshCount, 30_000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshCount()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return { count, failed }
}

export function AdminMessagesBadge() {
  const { count } = useUnreadMessages()
  if (!count) return null
  const label = `${count} unread ${count === 1 ? 'message' : 'messages'}`
  return <span className="admin-message-count-badge" aria-label={label} title={label}>{count > 99 ? '99+' : count}</span>
}

export function AdminUnreadMessagesNotice() {
  const { count, failed } = useUnreadMessages()
  if (failed) {
    return (
      <div className="admin-message-notice is-error" role="status">
        <span>Unread messages could not be checked.</span>
        <Link href="/admin/messages">Open Messages <span aria-hidden="true">→</span></Link>
      </div>
    )
  }
  if (!count) return null

  return (
    <div className="admin-message-notice" role="status" aria-live="polite">
      <span className="admin-message-notice-mark" aria-hidden="true" />
      <div><strong>{count} unread {count === 1 ? 'message' : 'messages'}</strong><span>New enquiries are waiting in your inbox.</span></div>
      <Link href="/admin/messages">View messages <span aria-hidden="true">→</span></Link>
    </div>
  )
}

export function AdminMessagesAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [router])

  return null
}
