import Link from 'next/link'

export default function AdminNav() {
  return (
    <header className="bg-black py-3">
      <div className="container flex items-center justify-between">
        <div className="text-lg font-bold">Admin • Clinton's Guitar</div>
        <nav className="space-x-3">
          <Link href="/admin" className="text-gray-300">Dashboard</Link>
          <Link href="/admin/products" className="text-gray-300">Products</Link>
          <Link href="/admin/orders" className="text-gray-300">Orders</Link>
          <Link href="/admin/settings" className="text-gray-300">Settings</Link>
        </nav>
      </div>
    </header>
  )
}
