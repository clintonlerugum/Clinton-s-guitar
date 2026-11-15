import Link from 'next/link'

type OfferIconName = 'arrangements' | 'download' | 'levels'

function OfferIcon({ name }: { name: OfferIconName }) {
  const paths: Record<OfferIconName, React.ReactNode> = {
    arrangements: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" /></>,
    levels: <><path d="M4 19V5m8 14V9m8 10V3M2 19h20" /><circle cx="4" cy="5" r="1.5" /><circle cx="12" cy="9" r="1.5" /><circle cx="20" cy="3" r="1.5" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const offers: Array<{ title: string; description: string; icon: OfferIconName }> = [
  {
    title: 'Guitar Arrangements',
    description: 'Carefully prepared arrangements of songs across different musical styles.',
    icon: 'arrangements',
  },
  {
    title: 'Downloadable Guitar Tabs',
    description: 'PDF arrangements you can keep close for learning and practice.',
    icon: 'download',
  },
  {
    title: 'Different Skill Levels',
    description: 'Find music suited to your experience and the way you like to play.',
    icon: 'levels',
  },
]

export default function About() {
  return (
    <div className="about-page">
      <header className="about-hero">
        <div className="about-hero-copy">
          <span className="about-eyebrow"><span aria-hidden="true" /> A little about us</span>
          <h1>About Clinton&apos;s Guitar</h1>
          <p>Clinton&apos;s Guitar is a platform dedicated to sharing guitar arrangements and making quality guitar music accessible to players of different skill levels.</p>
          <p>Discover carefully arranged guitar tabs designed to help you learn, practise and enjoy the music you love.</p>
        </div>
        <div className="about-hero-mark" aria-hidden="true">
          <span>CG</span>
          <i />
          <small>Learn · Play · Arrange</small>
        </div>
      </header>

      <section className="about-story" aria-labelledby="about-story-title">
        <div className="about-section-label">
          <span className="about-eyebrow">The person behind the music</span>
          <h2 id="about-story-title">Our Story</h2>
        </div>
        <p>Clinton&apos;s Guitar was created from a passion for guitar playing, music and arranging. The goal is to provide guitarists with enjoyable and accessible arrangements that make learning and playing music a rewarding experience.</p>
      </section>

      <section className="about-offers" aria-labelledby="about-offers-title">
        <div className="about-section-heading">
          <div>
            <span className="about-eyebrow">Made for your music journey</span>
            <h2 id="about-offers-title">What We Offer</h2>
          </div>
        </div>
        <div className="about-offer-grid">
          {offers.map((offer, index) => (
            <article className="about-offer-card" key={offer.title}>
              <div className="about-offer-card-top">
                <span className="about-offer-icon"><OfferIcon name={offer.icon} /></span>
                <span className="about-offer-number">0{index + 1}</span>
              </div>
              <h3>{offer.title}</h3>
              <p>{offer.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-mission" aria-labelledby="about-mission-title">
        <span className="about-eyebrow">Why we do it</span>
        <h2 id="about-mission-title">Our Mission</h2>
        <p>To make guitar music more accessible by providing enjoyable arrangements that inspire guitarists to learn, improve and express themselves through music.</p>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title">
        <div>
          <span className="about-eyebrow">Your next song is waiting</span>
          <h2 id="about-cta-title">Find Your Next Guitar Arrangement</h2>
          <p>Explore our collection of guitar tabs and discover your next favourite piece to play.</p>
        </div>
        <Link href="/shop" className="about-cta-button">Explore Guitar Tabs <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  )
}
