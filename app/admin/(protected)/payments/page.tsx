import { prisma } from '../../../../lib/prisma'
import { formatStoreDate } from '../../../../lib/format-store-date'
import { getStoreSettings } from '../../../../lib/store-settings'

export const dynamic = 'force-dynamic'

function maskPhone(phone: string) {
  const visibleDigits = phone.replace(/\D/g, '').slice(-3)
  return visibleDigits ? `••••••${visibleDigits}` : 'Unavailable'
}

export default async function AdminPaymentsPage() {
  const settings = await getStoreSettings()
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderId: true,
      provider: true,
      status: true,
      amount: true,
      phone: true,
      merchantRequestId: true,
      checkoutRequestId: true,
      receiptNumber: true,
      resultCode: true,
      createdAt: true,
      updatedAt: true,
      order: {
        select: {
          currency: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  return (
    <section className="admin-management-page">
      <header className="admin-management-heading">
        <div>
          <span className="admin-eyebrow">Store operations</span>
          <h1>Payments</h1>
          <p>Payment records and M-Pesa verification references. Secret credentials and raw callback payloads are not displayed.</p>
        </div>
      </header>

      {payments.length === 0 ? (
        <p className="admin-payment-empty">No payment records yet.</p>
      ) : (
        <div className="admin-payment-table-wrap">
          <table className="admin-payment-table">
            <thead>
              <tr>
                <th scope="col">Payment / order</th>
                <th scope="col">Customer</th>
                <th scope="col">Amount</th>
                <th scope="col">Provider / status</th>
                <th scope="col">Transaction references</th>
                <th scope="col">Verification</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <a className="text-amber-200 hover:text-amber-100" href={`/admin/orders#order-${encodeURIComponent(payment.orderId)}`}>
                      #{payment.orderId.slice(-8).toUpperCase()}
                    </a>
                    <small>{formatStoreDate(payment.createdAt, settings, { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                  </td>
                  <td>
                    {payment.order.user?.name || payment.order.user?.email || 'Customer account unavailable'}
                    <small>{maskPhone(payment.phone)}</small>
                  </td>
                  <td>{payment.order.currency} {payment.amount.toLocaleString('en-KE')}</td>
                  <td>
                    {payment.provider}
                    <small><span className={`admin-status-pill admin-status-${payment.status.toLowerCase()}`}>{payment.status}</span> · order {payment.order.status}</small>
                  </td>
                  <td className="admin-payment-reference">
                    {payment.receiptNumber || payment.checkoutRequestId || 'No receipt/reference'}
                    {payment.checkoutRequestId && payment.receiptNumber && <small>Checkout: {payment.checkoutRequestId}</small>}
                    {payment.merchantRequestId && <small>Merchant: {payment.merchantRequestId}</small>}
                  </td>
                  <td>
                    {payment.resultCode === null ? 'Awaiting result' : `Result code ${payment.resultCode}`}
                    <small>Last updated {formatStoreDate(payment.updatedAt, settings, { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
