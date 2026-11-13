'use client'

import { useEffect, useState } from 'react'

type PublicSettings = {
  storeName: string
  storeEmail: string
  storeDescription: string
  storeLogo: string
  supportContact: string
  footerContact: string
  youtubeUrl: string
  tiktokUrl: string
  instagramUrl: string
  facebookUrl: string
}

const fallback: PublicSettings = {
  storeName: "Clinton's Guitar",
  storeEmail: 'lerugumclintonguitars@gmail.com',
  storeDescription: 'Premium tabs for players who want to keep learning.',
  storeLogo: '/logo.svg',
  supportContact: '',
  footerContact: '',
  youtubeUrl: '',
  tiktokUrl: '',
  instagramUrl: '',
  facebookUrl: '',
}

export default function StoreFooter() {
  const [settings, setSettings] = useState(fallback)
  useEffect(() => {
    fetch('/api/store/settings').then((response) => {
      if (!response.ok) throw new Error('Unable to load public store settings.')
      return response.json()
    }).then((data: PublicSettings) => setSettings(data)).catch((error) => console.error(error))
  }, [])
  const contact = settings.footerContact || settings.supportContact
  const socialLinks = [
    ['YouTube', settings.youtubeUrl],
    ['TikTok', settings.tiktokUrl],
    ['Instagram', settings.instagramUrl],
    ['Facebook', settings.facebookUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <footer className="mt-20 border-t border-gray-800 bg-black py-12 text-gray-400">
      <div className="container grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <img src={settings.storeLogo || '/logo.svg'} alt={settings.storeName} className="mb-3 h-8" />
          <div className="text-sm">{settings.storeDescription}</div>
          <div className="mt-3 text-xs text-gray-500">© {new Date().getFullYear()} {settings.storeName}</div>
        </div>
        <div>
          <div className="font-semibold text-accent">Navigate</div>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li><a href="/shop">Shop</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-accent">Contact</div>
          <div className="mt-3 break-words text-sm text-gray-300">Email: <a href={`mailto:${settings.storeEmail}`}>{settings.storeEmail}</a></div>
          {contact && <div className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{contact}</div>}
          {socialLinks.length > 0 && <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-300">{socialLinks.map(([label, url]) => <a href={url} key={label} target="_blank" rel="noreferrer">{label}</a>)}</div>}
          <div className="mt-2 text-sm text-gray-500">Response within 24 hours</div>
        </div>
      </div>
    </footer>
  )
}
