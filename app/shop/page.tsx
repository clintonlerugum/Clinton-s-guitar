import Link from 'next/link'
import ProductCard from '../../components/ProductCard'
import { prisma } from '../../lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function Shop({ searchParams }: { searchParams?: any }) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const categorySlug = typeof searchParams?.category === 'string' ? searchParams.category : ''
  const selectedCategory = categorySlug
    ? await prisma.category.findFirst({ where: { slug: categorySlug, active: true }, select: { id: true, name: true, slug: true } })
    : null
  const where: Prisma.ProductWhereInput = {
    published: true,
    fullPdf: { not: null },
    ...(categorySlug ? selectedCategory
      ? { categories: { some: { categoryId: selectedCategory.id } } }
      : { id: '__inactive-or-missing-category__' } : {}),
    ...(q && {
      OR: [
        { title: { contains: q } },
        { artist: { contains: q } },
        { category: { contains: q } },
        { categories: { some: { category: { name: { contains: q } } } } },
        { description: { contains: q } }
      ]
    })
  }

  const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } })

  return (
    <section className="space-y-8">
      <div className="border-b border-gray-800 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">The collection</p>
        <div className="mt-2 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-bold text-white">{selectedCategory ? selectedCategory.name : 'Shop guitar tabs'}</h1>
            <p className="mt-2 text-gray-400">{selectedCategory ? `Explore guitar arrangements in ${selectedCategory.name}.` : 'Find your next song and start playing today.'}</p>
            {categorySlug && !selectedCategory && <p className="mt-2 text-sm text-amber-200">This category is unavailable or no longer active.</p>}
            {selectedCategory && <Link href="/shop" className="mt-2 inline-block text-sm text-accent hover:underline">View all guitar tabs</Link>}
          </div>
          <form method="get" className="flex w-full items-center gap-2 md:w-auto">
            <input name="q" defaultValue={q} placeholder="Search songs or artists" className="form-input min-w-0 md:w-64" />
            <button className="btn btn-primary shrink-0">Search</button>
          </form>
        </div>
      </div>

      <div className="shop-product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} showDifficulty showMissingDifficulty />
        ))}
      </div>
      {products.length === 0 && <p className="rounded-lg border border-gray-800 bg-gray-900/60 p-5 text-sm text-gray-400">No guitar tabs match this selection yet.</p>}
    </section>
  )
}
