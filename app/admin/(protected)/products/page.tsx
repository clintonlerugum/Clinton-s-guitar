import { prisma } from '../../../../lib/prisma'
import AdminProductsList from '../../../../components/AdminProductsList'

export const dynamic = 'force-dynamic'

export default async function AdminProducts({ searchParams }: { searchParams?: { success?: string | string[] } }) {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      artist: true,
      slug: true,
      price: true,
      currency: true,
      published: true,
      featured: true,
      difficulty: true,
      coverImage: true,
      fullPdf: true,
      createdAt: true,
      category: true,
      categories: { select: { category: { select: { name: true } } } },
    },
  })
  const requestedSuccess = searchParams?.success
  const success = Array.isArray(requestedSuccess) ? requestedSuccess[0] : requestedSuccess

  return (
    <section className="min-w-0">
      <AdminProductsList products={products.map((product) => ({
        id: product.id,
        title: product.title,
        artist: product.artist,
        slug: product.slug,
        price: product.price,
        published: product.published,
        featured: product.featured,
        difficulty: product.difficulty,
        categories: [...new Set([
          ...product.categories.map(({ category }) => category.name),
          ...(product.category ? [product.category] : []),
        ])],
        coverImage: product.coverImage,
        fullPdf: product.fullPdf,
        createdAt: product.createdAt.toISOString(),
      }))} success={success} />
    </section>
  )
}
