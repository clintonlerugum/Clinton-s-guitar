import Link from 'next/link'
import AddToCartButton from './AddToCartButton'

export default function ProductCard({
  product,
  showDifficulty = false,
  showMissingDifficulty = false,
  actions = false,
  showActions = true,
  featuredBadge = false,
}: {
  product: any
  showDifficulty?: boolean
  showMissingDifficulty?: boolean
  actions?: boolean
  showActions?: boolean
  featuredBadge?: boolean
}) {
  const content = (
    <>
      <div className="product-card-preview relative overflow-hidden rounded">
        <img src={product.coverImage ?? '/placeholders/cover1.jpg'} alt="" className="transition duration-500" />
      </div>
      <div className="product-card-info p-5">
        <h3 className="text-lg font-semibold text-white">{product.title}</h3>
        <p className="mb-3 text-sm text-gray-400">{product.artist}</p>
        {showDifficulty && (product.difficulty || showMissingDifficulty) && (
          <span className="product-card-difficulty">{product.difficulty || 'Not specified'}</span>
        )}
        {product.description && !showDifficulty && <p className="product-card-description">{product.description}</p>}
        <div className="text-xl font-bold text-accent">{product.currency} {product.price}</div>
      </div>
    </>
  )

  if (actions) {
    return (
      <article className={`card product-card home-product-card group${showActions ? '' : ' home-product-card-no-actions'}`}>
        {featuredBadge && <span className="home-featured-badge">Featured</span>}
        <Link href={`/tabs/${product.slug}`} aria-label={`View ${product.title} by ${product.artist}`} className="home-product-main">
          {content}
        </Link>
        {showActions && (
          <div className="home-product-actions">
            <Link href={`/tabs/${product.slug}`} className="home-product-view">View Tab</Link>
            <AddToCartButton productId={product.id} />
          </div>
        )}
      </article>
    )
  }

  return (
    <Link
      href={`/tabs/${product.slug}`}
      aria-label={`View ${product.title} by ${product.artist}`}
      className="block card product-card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(182,143,64,0.2)]"
    >
      {content}
    </Link>
  )
}
