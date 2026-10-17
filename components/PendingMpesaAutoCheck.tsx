'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const checkIntervalMs = 15_000
const passiveRefreshIntervalMs = 30_000
const maxAutomaticChecks = 20

export default function PendingMpesaAutoCheck({
  orderId,
  canReconcile = true
}: {
  orderId: string
  canReconcile?: boolean
}) {
  const router = useRouter()
  const [automaticChecks, setAutomaticChecks] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let checks = 0

    const checkPayment = async () => {
      if (!active) return
      if (canReconcile && checks < maxAutomaticChecks) {
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
        timer = setTimeout(
          checkPayment,
          canReconcile && checks < maxAutomaticChecks ? checkIntervalMs : passiveRefreshIntervalMs
        )
      }
    }

    timer = setTimeout(checkPayment, checkIntervalMs)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [canReconcile, orderId, router])

  return (
    <p className="mt-4 text-sm text-gray-400" aria-live="polite">
      {!canReconcile
        ? 'This order is pending. Your account will refresh while we wait for M-Pesa confirmation.'
        : automaticChecks < maxAutomaticChecks
          ? 'This order is pending. We’re checking M-Pesa and will update it here when payment is confirmed.'
          : 'Still pending. This order will change to PAID here when Safaricom confirms payment.'}
    </p>
  )
}
