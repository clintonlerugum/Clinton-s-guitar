'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderDeleteButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function deleteOrder() {
    if (!window.confirm('Delete this pending or failed order? This cannot be undone.')) return

    setDeleting(true)
    setError('')
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to delete this order.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this order.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost" disabled={deleting} onClick={deleteOrder}>
        {deleting ? 'Deleting...' : 'Delete order'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
