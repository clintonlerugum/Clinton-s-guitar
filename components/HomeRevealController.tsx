'use client'

import { useEffect } from 'react'

export default function HomeRevealController() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    document.body.classList.add('home-motion-ready')
    const observer = new IntersectionObserver((entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        currentObserver.unobserve(entry.target)
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })

    document.querySelectorAll('.home-reveal').forEach((section) => observer.observe(section))
    return () => {
      observer.disconnect()
      document.body.classList.remove('home-motion-ready')
    }
  }, [])

  return null
}
