import Link from 'next/link'
import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

function ProductActions({ id, published, hasPdf }: { id: string; published: boolean; hasPdf: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasPdf ? (
        <a href={'/api/admin/products/' + encodeURIComponent(id) + '/download'} className="rounded border border-accent px-2 py-1 text-sm text-accent hover:bg-accent hover:text-black">
          Download PDF
        </a>
      ) : (
        <span aria-disabled="true" title="Upload a full PDF to enable download" className="cursor-not-allowed rounded border border-gray-700 px-2 py-1 text-sm text-gray-500">
          No PDF
        </span>
      )}
      <Link href={'/admin/products/edit/' + id} className="rounded border px-2 py-1 text-sm">Edit</Link>
      <form action="/api/admin/products/action" method="post">
        <input type="hidden" name="id" value={id} />
        <button name="_action" value="toggle" className="rounded border px-2 py-1 text-sm">{published ? 'Unpublish' : 'Publish'}</button>
      </form>
      <form action="/api/admin/products/action" method="post">
        <input type="hidden" name="id" value={id} />
        <button name="_action" value="delete" className="rounded bg-red-600 px-2 py-1 text-sm">Delete</button>
      </form>
    </div>
  )
}

export default async function AdminProducts() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="w-full rounded bg-accent px-4 py-2 text-center text-black sm:w-auto">Add New Tab</Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No products yet.</div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {products.map((product) => (
              <article key={product.id} className="min-w-0 rounded-lg border border-gray-800 bg-gray-900 p-3">
                <div className="flex min-w-0 gap-3">
                  <img
                    src={product.coverImage ?? '/placeholders/cover1.jpg'}
                    alt={product.title + ' cover'}
                    className="h-20 w-16 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words font-semibold">{product.title}</h2>
                    <p className="break-words text-sm text-gray-400">{product.artist}</p>
                    <p className="mt-1 text-sm">{product.currency} {product.price}</p>
                    <p className="text-sm text-gray-400">{product.published ? 'Published' : 'Draft'}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-800 pt-3">
                  <ProductActions id={product.id} published={product.published} hasPdf={Boolean(product.fullPdf)} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded bg-gray-900 md:block">
            <table className="w-full min-w-[760px] table-auto">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Image</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Artist</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-gray-800">
                    <td className="p-3"><img src={product.coverImage ?? '/placeholders/cover1.jpg'} alt={product.title + ' cover'} className="w-16 rounded" /></td>
                    <td className="max-w-56 break-words p-3">{product.title}</td>
                    <td className="max-w-48 break-words p-3">{product.artist}</td>
                    <td className="whitespace-nowrap p-3">{product.currency} {product.price}</td>
                    <td className="whitespace-nowrap p-3">{product.published ? 'Published' : 'Draft'}</td>
                    <td className="p-3"><ProductActions id={product.id} published={product.published} hasPdf={Boolean(product.fullPdf)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
