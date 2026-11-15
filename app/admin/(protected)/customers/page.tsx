import Link from 'next/link'
import { prisma } from '../../../../lib/prisma'
import { getStoreSettings } from '../../../../lib/store-settings'
import { formatStoreDate } from '../../../../lib/format-store-date'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const settings = await getStoreSettings()
  const [customerCount, customers] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { orders: true } }
      }
    })
  ])

  return (
    <section className="admin-management-page">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="admin-eyebrow">Store relationships</span>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-gray-400">Registered customer accounts and order history</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 px-5 py-3 text-center">
          <div className="text-2xl font-bold text-accent">{customerCount}</div>
          <div className="text-sm text-gray-400">Accounts</div>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No customer accounts yet.</div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {customers.map((customer) => (
              <article key={customer.id} className="min-w-0 rounded-lg border border-gray-800 bg-gray-900 p-3">
                <h2 className="break-words font-semibold">{customer.name || 'Name not provided'}</h2>
                <p className="break-all text-sm text-gray-300">{customer.email}</p>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-gray-400">
                  <span>Joined {formatStoreDate(customer.createdAt, settings)}</span>
                  <span>{customer._count.orders} orders</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Account status: Registered (no separate status flag)</p>
                <Link href={`/admin/customers/${encodeURIComponent(customer.id)}`} className="mt-3 inline-flex text-xs font-semibold text-amber-200 hover:text-amber-100">View customer <span className="ml-1" aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg bg-gray-900 md:block">
            <table className="w-full min-w-[620px]">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Joined</th>
                  <th className="p-3 text-left">Orders</th>
                  <th className="p-3 text-left">Account status</th>
                  <th className="p-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-gray-800">
                    <td className="max-w-56 break-words p-3">{customer.name || 'Name not provided'}</td>
                    <td className="max-w-72 break-all p-3">{customer.email}</td>
                    <td className="whitespace-nowrap p-3">{formatStoreDate(customer.createdAt, settings)}</td>
                    <td className="p-3">{customer._count.orders}</td>
                    <td className="whitespace-nowrap p-3 text-gray-400">Registered*</td>
                    <td className="p-3"><Link href={`/admin/customers/${encodeURIComponent(customer.id)}`} className="text-amber-200 hover:text-amber-100">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">*This system does not store a separate active or suspended status.</p>
        </>
      )}
    </section>
  )
}
