import Link from 'next/link'
import { prisma } from '../lib/prisma'
import ProductCard from '../components/ProductCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const latest = await prisma.product.findMany({ where: { published: true, fullPdf: { not: null } }, orderBy: { createdAt: 'desc' }, take: 6 })

  return (
    <section>
      <div className="hero text-center">
        <h1 className="text-4xl font-bold text-white md:text-5xl">Premium Guitar Tabs &amp; Arrangements</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">High-quality, professionally transcribed guitar tabs for your favorite songs. Instant download, lifetime access.</p>
        <div className="mt-8">
          <Link href="/shop" className="btn btn-primary">Browse Tabs</Link>
        </div>
      </div>

      <div className="home-section">
        <h2 className="section-title">Latest Tabs</h2>
        <div className="product-grid latest-products">
        {latest.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        </div>
      </div>
    </section>
  )
}
