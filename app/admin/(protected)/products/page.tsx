import { prisma } from '../../../../lib/prisma'
import AdminProductsList from '../../../../components/AdminProductsList'

export const dynamic = 'force-dynamic'

export default async function AdminProducts() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <section className="min-w-0">
      <AdminProductsList products={products.map((product) => ({
        id: product.id,
        title: product.title,
        artist: product.artist,
        slug: product.slug,
        price: product.price,
        currency: product.currency,
        published: product.published,
        featured: product.featured,
        coverImage: product.coverImage,
        fullPdf: product.fullPdf
      }))} />
    </section>
  )
}
