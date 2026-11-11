'use client'

import Link from 'next/link'
import { useState } from 'react'

type ProductListItem = {
  id: string
  title: string
  artist: string
  slug: string
  price: number
  currency: string
  published: boolean
  featured: boolean
  coverImage: string | null
  fullPdf: string | null
}

function ProductActions({ id, published, featured, hasPdf }: { id: string; published: boolean; featured: boolean; hasPdf: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
      {hasPdf ? (
        <a href={'/api/admin/products/' + encodeURIComponent(id) + '/download'} className="rounded border border-accent px-2 py-1 text-sm text-accent hover:bg-accent hover:text-black">
          Download
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
        <button name="_action" value="feature" className="rounded border border-accent px-2 py-1 text-sm text-accent">{featured ? 'Remove Featured' : 'Feature'}</button>
      </form>
      <form action="/api/admin/products/action" method="post">
        <input type="hidden" name="id" value={id} />
        <button name="_action" value="delete" className="rounded bg-red-600 px-2 py-1 text-sm">Delete</button>
      </form>
    </div>
  )
}

export default function AdminProductsList({ products }: { products: ProductListItem[] }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase()
  const filteredProducts = query
    ? products.filter((product) =>
        `${product.title} ${product.artist} ${product.slug}`.toLocaleLowerCase().includes(query)
      )
    : products

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-5">
        <h1 className="text-2xl font-bold">Products</h1>
        {products.length > 0 && (
          <div className="min-w-0">
            <label htmlFor="admin-product-search" className="sr-only">Search products</label>
            <div className="relative">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400">
                <circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="m15.5 15.5 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
              <input
                id="admin-product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, artist, or slug"
                className="form-input w-full"
                style={{ height: '42px', paddingLeft: '2.75rem' }}
              />
            </div>
          </div>
        )}
        <Link href="/admin/products/new" className="flex h-[42px] w-full items-center justify-center whitespace-nowrap rounded bg-accent px-4 text-center text-black md:w-auto">
          Add New Tab
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No products yet.</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded bg-gray-900 p-4">No tabs match your search.</div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filteredProducts.map((product) => (
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
                    <p className="text-sm text-gray-400">{product.published ? 'Published' : 'Draft'}{product.featured ? ' · Featured' : ''}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-800 pt-3">
                  <ProductActions id={product.id} published={product.published} featured={product.featured} hasPdf={Boolean(product.fullPdf)} />
                </div>
              </article>
            ))}
          </div>

          <div className="-mx-4 hidden w-[calc(100%_+_2rem)] overflow-x-auto rounded bg-gray-900 md:block">
            <table className="w-full min-w-[760px] table-auto">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Image</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Artist</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Featured</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="h-14 border-t border-gray-800">
                    <td className="p-2 align-middle"><img src={product.coverImage ?? '/placeholders/cover1.jpg'} alt={product.title + ' cover'} className="h-9 w-8 rounded object-contain" /></td>
                    <td className="max-w-56 truncate p-2 align-middle">{product.title}</td>
                    <td className="max-w-48 truncate p-2 align-middle">{product.artist}</td>
                    <td className="whitespace-nowrap p-2 align-middle">{product.currency} {product.price}</td>
                    <td className="whitespace-nowrap p-2 align-middle">{product.published ? 'Published' : 'Draft'}</td>
                    <td className="whitespace-nowrap p-2 align-middle">{product.featured ? 'Featured' : '—'}</td>
                    <td className="p-2 align-middle"><ProductActions id={product.id} published={product.published} featured={product.featured} hasPdf={Boolean(product.fullPdf)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
