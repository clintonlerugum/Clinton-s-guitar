import Link from 'next/link'
import { prisma } from '../lib/prisma'
import ProductCard from '../components/ProductCard'
import HomeRevealController from '../components/HomeRevealController'
import StoreMaintenanceNotice from '../components/StoreMaintenanceNotice'
import { getStoreSettings } from '../lib/store-settings'
import { getTokenFromCookies, verifyToken } from '../lib/auth'

export const dynamic = 'force-dynamic'

function LineIcon({ name }: { name: 'music' | 'download' | 'levels' | 'secure' | 'browse' | 'cart' | 'payment' | 'pdf' }) {
  const paths = {
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" /></>,
    levels: <><path d="M4 19V5m8 14V9m8 10V3" /><path d="M2 19h20" /><circle cx="4" cy="5" r="1.5" /><circle cx="12" cy="9" r="1.5" /><circle cx="20" cy="3" r="1.5" /></>,
    secure: <><path d="M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    browse: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5M8 11h6M11 8v6" /></>,
    cart: <><path d="M3 4h2l2.2 11h11.3L21 8H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></>,
    payment: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18m-14 5h4" /></>,
    pdf: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5M9 14h6m-6 3h6" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export default async function Home() {
  const settings = await getStoreSettings()
  const identity = verifyToken(getTokenFromCookies())
  const isAdmin = Boolean(identity && typeof identity === 'object' && identity.role === 'ADMIN')
  if (settings.maintenanceMode && !isAdmin) return <StoreMaintenanceNotice />

  const visibleProduct = { published: true, fullPdf: { not: null } }
  const latest = await prisma.product.findMany({
    where: visibleProduct,
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
      artist: true,
      price: true,
      currency: true,
      difficulty: true,
      coverImage: true,
    },
  })
  const featured = await prisma.product.findMany({
    where: { ...visibleProduct, featured: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      artist: true,
      price: true,
      currency: true,
      difficulty: true,
      coverImage: true,
    },
  })
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      products: {
        where: { product: visibleProduct },
        select: { productId: true },
      },
    },
  })

  return (
    <section className="home-page">
      <HomeRevealController />
      {settings.announcementVisible && settings.announcement && (
        <aside className="store-announcement" role="status">{settings.announcement}</aside>
      )}
      <div className="hero home-hero">
        <div className="home-hero-content">
          <span className="home-hero-eyebrow"><span /> {settings.storeName} · Premium arrangements</span>
          <h1>The Art of Guitar,<br className="home-hero-break" /> Beautifully Arranged.</h1>
          <p>Thoughtfully arranged guitar music for the songs you love. Explore clear, beautifully presented tabs made for your next moment of music.</p>
          <div className="home-hero-actions">
            <Link href="/shop" className="btn btn-primary home-primary-cta">Explore Guitar Tabs <span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-hero-note"><span className="home-hero-rule" /> Discover your next arrangement <span className="home-hero-rule" /></div>
        </div>
        <a href="#latest-tabs" className="home-scroll-cue" aria-label="Scroll to latest guitar tabs"><span /></a>
      </div>

      {settings.showLatest && <section className="home-section home-section-latest home-reveal" id="latest-tabs" aria-labelledby="latest-tabs-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">From the collection</span>
            <h2 className="section-title" id="latest-tabs-title">Latest Guitar Tabs</h2>
            <p>Fresh arrangements, ready to bring to your music stand.</p>
          </div>
          <Link href="/shop" className="home-outline-link">View All Guitar Tabs <span aria-hidden="true">→</span></Link>
        </div>
        {latest.length > 0 ? (
          <div className="product-grid latest-products">
            {latest.map((product) => <ProductCard key={product.id} product={product} showDifficulty actions showActions={false} />)}
          </div>
        ) : (
          <p className="home-empty-note">New guitar arrangements are on their way. Please check back soon.</p>
        )}
      </section>}

      {settings.showFeatured && <section className="home-section home-featured-section home-reveal" aria-labelledby="home-featured-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">Handpicked for you</span>
            <h2 className="section-title" id="home-featured-title">Featured Arrangements</h2>
            <p>Explore a few highlights from the Clinton&apos;s Guitar collection.</p>
          </div>
        </div>
        {featured.length > 0 ? (
          <div className="product-grid latest-products home-featured-products">
            {featured.map((product) => <ProductCard key={product.id} product={product} showDifficulty actions showActions={false} featuredBadge />)}
          </div>
        ) : (
          <p className="home-empty-note">Featured arrangements will appear here as they are selected.</p>
        )}
      </section>}

      {settings.showCategories && categories.length > 0 && (
        <section className="home-section home-category-section home-reveal" aria-labelledby="home-categories-title">
          <div className="home-section-heading">
            <div>
              <span className="home-eyebrow">Find your sound</span>
              <h2 className="section-title" id="home-categories-title">Browse by Category</h2>
              <p>Explore real categories from the published collection.</p>
            </div>
            <Link href="/shop" className="home-text-link">Explore the collection <span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-category-grid">
            {categories.map((category) => (
              <Link
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="home-category-card"
                key={category.name}
              >
                <img src={category.image} alt="" className="home-category-image" loading="lazy" />
                <span className="home-category-mark" aria-hidden="true"><LineIcon name="music" /></span>
                <span className="home-category-name">{category.name}</span>
                <span className="home-category-count">{category.description}</span>
                <span className="home-category-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {settings.showBenefits && <section className="home-section home-benefits-section home-reveal" aria-labelledby="home-benefits-title">
        <div className="home-section-heading home-section-heading-centered">
          <div>
            <span className="home-eyebrow">Made for music makers</span>
            <h2 className="section-title" id="home-benefits-title">Why Choose Clinton&apos;s Guitar</h2>
            <p>Everything you need to enjoy learning and playing the songs you love.</p>
          </div>
        </div>
        <div className="home-benefit-grid">
          <article className="home-benefit-card"><span><LineIcon name="music" /></span><h3>Thoughtfully Arranged</h3><p>Carefully prepared guitar music, made to be clear and enjoyable to play.</p></article>
          <article className="home-benefit-card"><span><LineIcon name="download" /></span><h3>Instant PDF Access</h3><p>Get your downloadable arrangement after a successful purchase.</p></article>
          <article className="home-benefit-card"><span><LineIcon name="levels" /></span><h3>For Every Journey</h3><p>Find arrangements with difficulty levels to guide your next step.</p></article>
          <article className="home-benefit-card"><span><LineIcon name="secure" /></span><h3>Convenient Checkout</h3><p>Complete your order securely with the available checkout options.</p></article>
        </div>
      </section>}

      {settings.showHowItWorks && <section className="home-section home-steps-section home-reveal" aria-labelledby="home-steps-title">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">Four simple steps</span>
            <h2 className="section-title" id="home-steps-title">How It Works</h2>
            <p>From choosing a song to playing your arrangement.</p>
          </div>
        </div>
        <ol className="home-steps-grid">
          <li><span className="home-step-number">01</span><span className="home-step-icon"><LineIcon name="browse" /></span><h3>Browse arrangements</h3><p>Find a song that inspires you.</p></li>
          <li><span className="home-step-number">02</span><span className="home-step-icon"><LineIcon name="cart" /></span><h3>Add to your cart</h3><p>Keep your favourite tabs together.</p></li>
          <li><span className="home-step-number">03</span><span className="home-step-icon"><LineIcon name="payment" /></span><h3>Complete payment</h3><p>Finish your order through checkout.</p></li>
          <li><span className="home-step-number">04</span><span className="home-step-icon"><LineIcon name="pdf" /></span><h3>Download your PDF</h3><p>Open your arrangement and start playing.</p></li>
        </ol>
        <Link href="/shop" className="btn btn-primary home-steps-cta">Find Your Next Arrangement <span aria-hidden="true">→</span></Link>
      </section>}
    </section>
  )
}
