import { prisma } from '../../../lib/prisma'
import AddToCartButton from '../../../components/AddToCartButton'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export default async function TabPage({ params }: Props) {
  const p = await prisma.product.findFirst({ where: { slug: params.slug, published: true, fullPdf: { not: null } } })
  if (!p) return <div>Product not found</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="card">
        <img src={p.coverImage ?? '/placeholders/cover1.jpg'} alt={p.title} className="w-full rounded" />
      </div>

      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold">{p.title}</h1>
        <p className="text-gray-300 mt-1">by {p.artist}</p>
        <div className="mt-4 text-gray-200">{p.description}</div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <div className="text-sm text-gray-400">Difficulty</div>
            <div className="font-semibold">{p.difficulty ?? '—'}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Tuning</div>
            <div className="font-semibold">{p.tuning ?? 'Not specified'}</div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="text-3xl font-bold">{p.currency} {p.price}</div>
          <AddToCartButton productId={p.id} />
          <AddToCartButton productId={p.id} redirectToCart />
        </div>
      </div>
    </div>
  )
}
