import Link from 'next/link'
import ProductCard from '../../components/ProductCard'
import { prisma } from '../../lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function Shop({ searchParams }: { searchParams?: any }) {
  const q = searchParams?.q ?? ''
  const where: Prisma.ProductWhereInput = {
    published: true,
    fullPdf: { not: null },
    ...(q && {
      OR: [
        { title: { contains: q } },
        { artist: { contains: q } },
        { category: { contains: q } },
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
          <div><h1 className="text-4xl font-bold text-white">Shop guitar tabs</h1><p className="mt-2 text-gray-400">Find your next song and start playing today.</p></div>
          <form method="get" className="flex w-full items-center gap-2 md:w-auto">
            <input name="q" defaultValue={q} placeholder="Search songs or artists" className="form-input min-w-0 md:w-64" />
            <button className="btn btn-primary shrink-0">Search</button>
          </form>
        </div>
      </div>

      <div className="shop-product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
