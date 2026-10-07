import Link from 'next/link'
import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminProducts() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="px-4 py-2 bg-accent text-black rounded">Add New Tab</Link>
      </div>

      <div className="bg-gray-900 rounded overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Price</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-gray-800">
                <td className="p-2"><img src={p.coverImage ?? '/placeholders/cover1.jpg'} className="w-16" /></td>
                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.artist}</td>
                <td className="p-2">{p.currency} {p.price}</td>
                <td className="p-2">{p.published ? 'Published' : 'Draft'}</td>
                <td className="p-2 space-x-2">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/products/edit/${p.id}`} className="px-2 py-1 border rounded text-sm">Edit</a>
                    <form action="/api/admin/products/action" method="post" className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <button name="_action" value="toggle" className="px-2 py-1 border rounded text-sm">{p.published ? 'Unpublish' : 'Publish'}</button>
                    </form>
                    <form action="/api/admin/products/action" method="post" className="inline ml-2">
                      <input type="hidden" name="id" value={p.id} />
                      <button name="_action" value="delete" className="px-2 py-1 bg-red-600 rounded text-sm">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}