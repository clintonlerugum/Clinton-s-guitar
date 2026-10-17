'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const checkIntervalMs = 15_000
const passiveRefreshIntervalMs = 30_000
const maxAutomaticChecks = 20

export default function PendingMpesaAutoCheck({
  orderId,
  redirectAfterMs,
  accountPage = false
}: {
  orderId: string
  redirectAfterMs?: number
  accountPage?: boolean
}) {
  const router = useRouter()
  const [automaticChecks, setAutomaticChecks] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let checks = 0

    const checkPayment = async () => {
      if (!active) return
      if (checks < maxAutomaticChecks) {
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
          // Keep the order pending if a status check cannot reach the server.
        }
      }

      if (active) {
        router.refresh()
        timer = setTimeout(checkPayment, checks < maxAutomaticChecks ? checkIntervalMs : passiveRefreshIntervalMs)
      }
    }

    timer = setTimeout(checkPayment, checkIntervalMs)
    const redirectTimer = redirectAfterMs === undefined
      ? undefined
      : setTimeout(() => {
          if (active) router.replace(`/account?pendingOrderId=${encodeURIComponent(orderId)}`)
        }, redirectAfterMs)
    return () => {
      active = false
      clearTimeout(timer)
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [orderId, redirectAfterMs, router])

  return (
    <p className="mt-4 text-sm text-gray-400" aria-live="polite">
      {automaticChecks < maxAutomaticChecks
        ? accountPage
          ? 'This order is pending. We’re checking M-Pesa and will update it here when payment is confirmed.'
          : 'We’re checking with M-Pesa automatically. Keep this page open and approve the prompt on your phone.'
        : accountPage
          ? 'Still pending. This order will change to PAID here when Safaricom confirms payment.'
          : 'Still waiting for M-Pesa. We’ll take you to your account shortly so you can follow this order there.'}
    </p>
  )
}
