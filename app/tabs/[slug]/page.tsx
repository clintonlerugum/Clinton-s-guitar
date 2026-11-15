import Link from 'next/link'
import { prisma } from '../../../lib/prisma'
import AddToCartButton from '../../../components/AddToCartButton'
import ProductCard from '../../../components/ProductCard'
import { getYouTubeEmbedUrl } from '../../../lib/youtube'

export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export default async function TabPage({ params }: Props) {
  const product = await prisma.product.findFirst({
    where: { slug: params.slug, published: true, fullPdf: { not: null } },
    select: {
      id: true,
      title: true,
      slug: true,
      artist: true,
      description: true,
      price: true,
      currency: true,
      difficulty: true,
      tuning: true,
      capo: true,
      style: true,
      coverImage: true,
      previewPdf: true,
      previewMedia: true,
      categories: { select: { categoryId: true } },
    },
  })

  if (!product) return <div className="tab-product-not-found">Product not found</div>

  const videoUrl = getYouTubeEmbedUrl(product.previewMedia)
  const coverImage = product.coverImage?.trim() || null
  const previewPdf = product.previewPdf?.trim() || null
  const categoryIds = product.categories.map(({ categoryId }) => categoryId)

  const relatedWhere = {
    published: true,
    fullPdf: { not: null },
    id: { not: product.id },
    ...(categoryIds.length ? { categories: { some: { categoryId: { in: categoryIds } } } } : {}),
  }
  const related = await prisma.product.findMany({
    where: relatedWhere,
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: {
      id: true,
      slug: true,
      title: true,
      artist: true,
      difficulty: true,
      price: true,
      currency: true,
      coverImage: true,
    },
  })
  const relatedProducts = related.length < 4
    ? [
      ...related,
      ...await prisma.product.findMany({
        where: {
          published: true,
          fullPdf: { not: null },
          id: { notIn: [product.id, ...related.map(({ id }) => id)] },
        },
        orderBy: { createdAt: 'desc' },
        take: 4 - related.length,
        select: {
          id: true,
          slug: true,
          title: true,
          artist: true,
          difficulty: true,
          price: true,
          currency: true,
          coverImage: true,
        },
      }),
    ]
    : related

  const details = [
    product.tuning && { label: 'Tuning', value: product.tuning },
    product.capo && { label: 'Capo', value: product.capo },
    product.difficulty && { label: 'Difficulty', value: product.difficulty },
    product.style && { label: 'Arrangement style', value: product.style },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail))

  return (
    <article className="tab-product-page">
      <nav className="tab-product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link><span aria-hidden="true">/</span><span>{product.title}</span>
      </nav>

      <div className="tab-product-layout">
        <div className="tab-product-media">
          <div className="tab-product-cover">
            {coverImage ? (
              <img src={coverImage} alt={`${product.title} arrangement cover`} className="tab-product-cover-image" />
            ) : previewPdf ? (
              <iframe
                src={`${previewPdf}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                title={`${product.title} sheet preview`}
                className="tab-product-cover-pdf"
              />
            ) : (
              <div className="tab-product-cover-placeholder">Preview not available</div>
            )}
            {coverImage && <div className="tab-product-cover-fade" aria-hidden="true" />}
          </div>

          {coverImage && previewPdf && (
            <section className="tab-product-pdf" aria-label="PDF arrangement preview">
              <iframe
                src={`${previewPdf}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                title={`${product.title} PDF preview`}
                loading="lazy"
              />
            </section>
          )}

          <section className="tab-product-video" aria-labelledby="tab-product-video-title">
            <div className="tab-product-section-heading">
              <span className="tab-product-eyebrow">Listen and follow along</span>
              <h2 id="tab-product-video-title">Watch the arrangement</h2>
            </div>
            {videoUrl ? (
              <div className="tab-product-video-frame">
                <iframe
                  src={videoUrl}
                  title={`${product.title} by ${product.artist} guitar tab video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="tab-product-video-empty">
                Video preview not added yet. Add this tab&apos;s YouTube link in Admin to show it here.
              </div>
            )}
          </section>
        </div>

        <div className="tab-product-information">
          <section className="tab-product-overview">
            <span className="tab-product-eyebrow">Guitar arrangement</span>
            <h1>{product.title}</h1>
            <p className="tab-product-artist">By {product.artist}</p>
            {product.difficulty && <span className="product-card-difficulty">{product.difficulty}</span>}
            {product.description && <p className="tab-product-description">{product.description}</p>}

            <div className="tab-product-price">{product.currency} {product.price.toLocaleString('en-KE')}</div>
            <div className="tab-product-purchase-actions">
              <AddToCartButton productId={product.id} />
              <AddToCartButton productId={product.id} redirectToCart />
            </div>
          </section>

          <section className="tab-product-included">
            <h2>What&apos;s included</h2>
            <ul>
              <li><span aria-hidden="true">♪</span> Complete downloadable guitar arrangement (PDF)</li>
              {product.tuning && <li><span aria-hidden="true">♪</span> Tuning: {product.tuning}</li>}
              {product.difficulty && <li><span aria-hidden="true">♪</span> {product.difficulty} difficulty</li>}
              {product.capo && <li><span aria-hidden="true">♪</span> Capo: {product.capo}</li>}
            </ul>
          </section>

          {details.length > 0 && (
            <section className="tab-product-details">
              <h2>Arrangement details</h2>
              <dl>
                {details.map((detail) => (
                  <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="tab-product-related" aria-labelledby="tab-product-related-title">
          <div className="tab-product-related-heading">
            <div><span className="tab-product-eyebrow">Keep exploring</span><h2 id="tab-product-related-title">Related arrangements</h2></div>
            <Link href="/shop">View all tabs <span aria-hidden="true">→</span></Link>
          </div>
          <div className="shop-product-grid">
            {relatedProducts.map((item) => <ProductCard key={item.id} product={item} showDifficulty showMissingDifficulty />)}
          </div>
        </section>
      )}
    </article>
  )
}
