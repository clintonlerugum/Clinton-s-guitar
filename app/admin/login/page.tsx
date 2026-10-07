import React from 'react'

export default function AdminLogin() {
  return (
    <div className="container py-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <form action="/api/auth/login" method="post" className="max-w-sm grid gap-3">
          <input name="email" type="email" placeholder="Email" className="px-3 py-2 bg-gray-800 rounded" />
          <input name="password" type="password" placeholder="Password" className="px-3 py-2 bg-gray-800 rounded" />
          <button type="submit" className="px-4 py-2 bg-accent text-black rounded">Log in</button>
        </form>
        <p className="text-sm text-gray-400 mt-4">Initial admin credentials are configured through environment variables.</p>
      </section>
    </div>
  )
}
