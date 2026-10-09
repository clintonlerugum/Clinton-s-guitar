import Link from 'next/link'

export default function ProductCard({ product }: any) {
  return (
    <Link
      href={`/tabs/${product.slug}`}
      aria-label={`View ${product.title} by ${product.artist}`}
      className="block card product-card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(182,143,64,0.2)]"
    >
      <div className="product-card-preview relative overflow-hidden rounded">
        <img src={product.coverImage ?? '/placeholders/cover1.jpg'} alt="" className="transition duration-500" />
      </div>
      <div className="product-card-info p-5">
        <h3 className="text-lg font-semibold text-white">{product.title}</h3>
        <p className="mb-3 text-sm text-gray-400">{product.artist}</p>
        {product.description && <p className="product-card-description">{product.description}</p>}
        <div className="text-xl font-bold text-accent">{product.currency} {product.price}</div>
      </div>
    </Link>
  )
}

