import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const totalTabs = await prisma.product.count()
  const publishedTabs = await prisma.product.count({ where: { published: true } })
  const totalOrders = await prisma.order.count({ where: { status: 'PAID' } })
  const revenueAgg = await prisma.order.aggregate({ _sum: { total: true }, where: { status: 'PAID' } })
  const revenue = revenueAgg._sum.total ?? 0

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-800 rounded">Total Tabs: {totalTabs}</div>
        <div className="p-4 bg-gray-800 rounded">Published: {publishedTabs}</div>
        <div className="p-4 bg-gray-800 rounded">Successful purchases: {totalOrders}</div>
        <div className="p-4 bg-gray-800 rounded">Revenue: KES {revenue}</div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Recent Products</h2>
      {/* A simple list */}
    </section>
  )
}