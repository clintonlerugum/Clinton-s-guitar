'use client'

import { useState } from 'react'

type SalesPoint = { date: string; amount: number }
type Period = 7 | 30 | 90

const currency = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
})

export default function AdminSalesChart({ data }: { data: SalesPoint[] }) {
  const [period, setPeriod] = useState<Period>(7)

  const points = data.slice(-period)
  const bucketCount = period === 7 ? 7 : period === 30 ? 10 : 15
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = Math.floor(index * points.length / bucketCount)
    const end = Math.floor((index + 1) * points.length / bucketCount)
    const range = points.slice(start, end)
    return {
      amount: range.reduce((total, point) => total + point.amount, 0),
      label: range[0]?.date
        ? new Date(`${range[0].date}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
        : '',
    }
  })
  const maximum = Math.max(...buckets.map((bucket) => bucket.amount), 1)
  const chart = {
    buckets,
    maximum,
    total: points.reduce((total, point) => total + point.amount, 0),
  }

  return (
    <section className="admin-panel admin-sales-panel" aria-labelledby="admin-sales-title">
      <div className="admin-panel-heading">
        <div>
          <span className="admin-eyebrow">Performance</span>
          <h2 id="admin-sales-title">Sales overview</h2>
        </div>
        <div className="admin-period-tabs" aria-label="Sales chart period">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              className={period === days ? 'is-selected' : ''}
              aria-pressed={period === days}
              onClick={() => setPeriod(days)}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>
      <div className="admin-sales-total">
        <strong>{currency.format(chart.total)}</strong>
        <span>Paid revenue · last {period} days</span>
      </div>
      <div
        className="admin-chart"
        role="img"
        aria-label={`Paid revenue for the last ${period} days: ${currency.format(chart.total)} total`}
      >
        {chart.buckets.map((bucket, index) => (
          <div className="admin-chart-column" key={`${period}-${index}`} title={`${bucket.label}: ${currency.format(bucket.amount)}`}>
            <div className="admin-chart-track">
              <div
                className="admin-chart-bar"
                style={{ height: `${bucket.amount === 0 ? 0 : Math.max(5, bucket.amount / chart.maximum * 100)}%` }}
              />
            </div>
            <span>{period === 7 || index % (period === 30 ? 2 : 3) === 0 ? bucket.label : ''}</span>
          </div>
        ))}
      </div>
      <div className="admin-chart-axis">
        <span>Daily paid sales</span>
        <span>All figures in KES</span>
      </div>
    </section>
  )
}
