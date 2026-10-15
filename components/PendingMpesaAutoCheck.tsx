'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const checkIntervalMs = 15_000
const maxAutomaticChecks = 20

export default function PendingMpesaAutoCheck({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [automaticChecks, setAutomaticChecks] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let checks = 0

    const checkPayment = async () => {
      if (!active || checks >= maxAutomaticChecks) return
      checks += 1
      setAutomaticChecks(checks)

      const form = new FormData()
      form.set('orderId', orderId)
      try {
        await fetch('/api/payments/mpesa/reconcile', {
          method: 'POST',
          body: form,
          credentials: 'same-origin'
        })
      } catch {
        // Keep the checkout pending if a status check cannot reach the server.
      }

      if (active) {
        router.refresh()
        if (checks < maxAutomaticChecks) timer = setTimeout(checkPayment, checkIntervalMs)
      }
    }

    timer = setTimeout(checkPayment, checkIntervalMs)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [orderId, router])

  return (
    <p className="mt-4 text-sm text-gray-400" aria-live="polite">
      {automaticChecks < maxAutomaticChecks
        ? 'We’re checking with M-Pesa automatically. Keep this page open and approve the prompt on your phone.'
        : 'Still waiting for M-Pesa. This page will stay open; you can check again below.'}
    </p>
  )
}
