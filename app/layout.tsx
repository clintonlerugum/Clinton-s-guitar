import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import Navbar from '../components/Navbar'

export const metadata: Metadata = {
  title: "Clinton's Guitar",
  description: 'Learn. Play. Arrange. Guitar tabs and arrangements.'
}

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container py-8">{children}</main>
        <footer className="mt-20 border-t border-gray-800 bg-black py-12 text-gray-400">
          <div className="container grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <img src="/logo.svg" alt="Clinton's Guitar" className="mb-3 h-8" />
              <div className="text-sm">Premium tabs for players who want to keep learning.</div>
              <div className="mt-3 text-xs text-gray-500">© {new Date().getFullYear()} Clinton's Guitar</div>
            </div>
            <div>
              <div className="font-semibold text-accent">Navigate</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li><a href="/shop">Shop</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-accent">Contact</div>
              <div className="mt-3 text-sm text-gray-300">Email: <a href="mailto:lerugumclintonguitars@gmail.com">lerugumclintonguitars@gmail.com</a></div>
              <div className="mt-2 text-sm text-gray-500">Response within 24 hours</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
