import Link from 'next/link'

export default function AdminNav() {
  return (
    <header className="bg-black py-3">
      <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center text-lg font-bold sm:text-left">Admin • Clinton&apos;s Guitar</div>
        <nav aria-label="Admin navigation" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm sm:justify-end sm:text-base">
          <Link href="/admin" className="text-gray-300 hover:text-accent">Dashboard</Link>
          <Link href="/admin/products" className="text-gray-300 hover:text-accent">Products</Link>
          <Link href="/admin/orders" className="text-gray-300 hover:text-accent">Orders</Link>
          <Link href="/admin/settings" className="text-gray-300 hover:text-accent">Settings</Link>
        </nav>
      </div>
    </header>
  )
}
