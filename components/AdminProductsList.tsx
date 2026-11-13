'use client'

import Link from 'next/link'
import { useState } from 'react'

type ProductListItem = {
  id: string
  title: string
  artist: string
  slug: string
  price: number
  published: boolean
  featured: boolean
  difficulty: string | null
  categories: string[]
  coverImage: string | null
  fullPdf: string | null
  createdAt: string
}

const notices: Record<string, string> = {
  created: 'Product created successfully.',
  updated: 'Product changes saved successfully.',
  published: 'Product published successfully.',
  unpublished: 'Product unpublished successfully.',
  featured: 'Product added to Featured Arrangements.',
  unfeatured: 'Product removed from Featured Arrangements.',
  deleted: 'Product deleted successfully.',
}

function ProductActions({ product }: { product: ProductListItem }) {
  return (
    <div className="admin-products-actions">
      {product.published && <Link href={`/tabs/${encodeURIComponent(product.slug)}`} className="admin-product-action">View</Link>}
      <Link href={`/admin/products/edit/${encodeURIComponent(product.id)}`} className="admin-product-action">Edit</Link>
      {product.fullPdf ? (
        <a href={`/api/admin/products/${encodeURIComponent(product.id)}/download`} className="admin-product-action is-accent">Download</a>
      ) : (
        <span className="admin-product-action is-disabled" title="Upload a protected full PDF to enable downloads">No PDF</span>
      )}
      <form action="/api/admin/products/action" method="post">
        <input type="hidden" name="id" value={product.id} />
        <button name="_action" value="toggle" className="admin-product-action">{product.published ? 'Unpublish' : 'Publish'}</button>
      </form>
      <form action="/api/admin/products/action" method="post">
        <input type="hidden" name="id" value={product.id} />
        <button name="_action" value="feature" className="admin-product-action is-accent">{product.featured ? 'Unfeature' : 'Feature'}</button>
      </form>
      <form action="/api/admin/products/action" method="post" onSubmit={(event) => {
        if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) event.preventDefault()
      }}>
        <input type="hidden" name="id" value={product.id} />
        <button name="_action" value="delete" className="admin-product-action is-danger">Delete</button>
      </form>
    </div>
  )
}

function statusClass(isActive: boolean) {
  return `admin-product-status${isActive ? ' is-active' : ''}`
}

export default function AdminProductsList({ products, success }: { products: ProductListItem[]; success?: string }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [publication, setPublication] = useState('all')
  const [featured, setFeatured] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const categoryOptions = Array.from(new Set(products.flatMap((product) => product.categories))).sort((a, b) => a.localeCompare(b))
  const difficultyOptions = Array.from(new Set(products.map((product) => product.difficulty).filter((value): value is string => Boolean(value))))
    .sort((a, b) => a.localeCompare(b))
  const query = search.trim().toLocaleLowerCase()

  const filtered = products.filter((product) => {
    if (query && !product.title.toLocaleLowerCase().includes(query)) return false
    if (category !== 'all' && !product.categories.includes(category)) return false
    if (difficulty === 'not-specified' && product.difficulty) return false
    if (difficulty !== 'all' && difficulty !== 'not-specified' && product.difficulty !== difficulty) return false
    if (publication === 'published' && !product.published) return false
    if (publication === 'draft' && product.published) return false
    if (featured === 'featured' && !product.featured) return false
    if (featured === 'not-featured' && product.featured) return false
    return true
  }).sort((a, b) => {
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
    if (sort === 'title') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    if (sort === 'price-low') return a.price - b.price
    if (sort === 'price-high') return b.price - a.price
    return b.createdAt.localeCompare(a.createdAt)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const publishedCount = products.filter((product) => product.published).length
  const featuredCount = products.filter((product) => product.featured).length
  const summary = [
    { label: 'Total Products', value: products.length, tone: 'gold' },
    { label: 'Published Products', value: publishedCount, tone: 'green' },
    { label: 'Draft Products', value: products.length - publishedCount, tone: 'muted' },
    { label: 'Featured Arrangements', value: featuredCount, tone: 'gold' },
  ]

  function resetPage(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  return (
    <section className="admin-products-page">
      <header className="admin-products-heading">
        <div>
          <span className="admin-eyebrow">Store catalogue</span>
          <h1>Products Management</h1>
          <p>Review and manage guitar tabs, publication status, categories and featured arrangements.</p>
        </div>
        <Link href="/admin/products/new" className="admin-products-add-button">
          <span aria-hidden="true">＋</span> Add New Product
        </Link>
      </header>

      {success && notices[success] && <p className="admin-products-notice" role="status">{notices[success]}</p>}

      <div className="admin-products-summary" aria-label="Product summary">
        {summary.map((item) => (
          <article className="admin-products-summary-card" key={item.label}>
            <span className={`admin-products-summary-mark is-${item.tone}`} aria-hidden="true" />
            <div><span>{item.label}</span><strong>{item.value.toLocaleString('en-KE')}</strong></div>
          </article>
        ))}
      </div>

      <section className="admin-products-catalog-panel" aria-label="Product catalogue">
        <div className="admin-products-toolbar">
          <label className="admin-products-search">
            <span className="sr-only">Search product titles</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" /></svg>
            <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search product title" />
          </label>
          <label><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => resetPage(setCategory, event.target.value)}><option value="all">All categories</option>{categoryOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label><span className="sr-only">Filter by difficulty</span><select value={difficulty} onChange={(event) => resetPage(setDifficulty, event.target.value)}><option value="all">All difficulties</option>{difficultyOptions.map((option) => <option value={option} key={option}>{option}</option>)}<option value="not-specified">Not specified</option></select></label>
          <label><span className="sr-only">Filter by publication status</span><select value={publication} onChange={(event) => resetPage(setPublication, event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></label>
          <label><span className="sr-only">Filter by featured status</span><select value={featured} onChange={(event) => resetPage(setFeatured, event.target.value)}><option value="all">All featured states</option><option value="featured">Featured</option><option value="not-featured">Not featured</option></select></label>
          <label><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => resetPage(setSort, event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option></select></label>
        </div>

        <div className="admin-products-results">
          <span>{filtered.length.toLocaleString('en-KE')} {filtered.length === 1 ? 'product' : 'products'}</span>
          {filtered.length > 0 && <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}</span>}
        </div>

        {products.length === 0 ? (
          <div className="admin-products-empty"><h2>No products yet</h2><p>Add your first guitar tab to start building the catalogue.</p><Link href="/admin/products/new" className="admin-products-add-button">Add New Product</Link></div>
        ) : filtered.length === 0 ? (
          <p className="admin-products-empty-note">No products match these search and filter choices.</p>
        ) : (
          <>
            <div className="admin-products-mobile-list">
              {pageProducts.map((product) => (
                <article className="admin-products-mobile-card" key={product.id}>
                  <div className="admin-products-mobile-main">
                    <img src={product.coverImage || '/placeholders/cover1.jpg'} alt="" />
                    <div className="admin-products-mobile-copy">
                      <h2>{product.title}</h2><p>{product.artist}</p>
                      <strong>KES {product.price.toLocaleString('en-KE')}</strong>
                    </div>
                  </div>
                  <dl className="admin-products-mobile-meta">
                    <div><dt>Category</dt><dd>{product.categories.join(', ') || 'Uncategorized'}</dd></div>
                    <div><dt>Difficulty</dt><dd>{product.difficulty || 'Not specified'}</dd></div>
                    <div><dt>Status</dt><dd><span className={statusClass(product.published)}>{product.published ? 'Published' : 'Draft'}</span></dd></div>
                    <div><dt>Featured</dt><dd><span className={statusClass(product.featured)}>{product.featured ? 'Featured' : 'Not featured'}</span></dd></div>
                    <div><dt>Date added</dt><dd>{new Date(product.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                  </dl>
                  <ProductActions product={product} />
                </article>
              ))}
            </div>

            <div className="admin-products-table-wrap">
              <table className="admin-products-table">
                <thead><tr><th>Product</th><th>Category</th><th>Difficulty</th><th>Price</th><th>Status</th><th>Featured</th><th>Date added</th><th>Actions</th></tr></thead>
                <tbody>
                  {pageProducts.map((product) => (
                    <tr key={product.id}>
                      <td><div className="admin-products-table-product"><img src={product.coverImage || '/placeholders/cover1.jpg'} alt="" /><div><strong>{product.title}</strong><span>{product.artist}</span></div></div></td>
                      <td>{product.categories.join(', ') || 'Uncategorized'}</td>
                      <td>{product.difficulty || <span className="admin-products-muted">Not specified</span>}</td>
                      <td className="admin-products-price">KES {product.price.toLocaleString('en-KE')}</td>
                      <td><span className={statusClass(product.published)}>{product.published ? 'Published' : 'Draft'}</span></td>
                      <td><span className={statusClass(product.featured)}>{product.featured ? 'Featured' : 'Not featured'}</span></td>
                      <td className="admin-products-date">{new Date(product.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td><ProductActions product={product} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && <nav className="admin-products-pagination" aria-label="Product pages">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
            </nav>}
          </>
        )}
      </section>
    </section>
  )
}
