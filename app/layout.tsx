import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import Navbar from '../components/Navbar'
import StoreFooter from '../components/StoreFooter'

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
        <StoreFooter />
      </body>
    </html>
  )
}
