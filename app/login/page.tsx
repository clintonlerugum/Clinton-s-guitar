import React from 'react'

export default function LoginPage({ searchParams }: { searchParams?: { redirectTo?: string } }) {
  const redirectTo = searchParams?.redirectTo || '/account'

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Log in</h1>
      <form action="/api/auth/login" method="post" className="max-w-sm grid gap-3">
        <input name="email" type="email" placeholder="Email" className="px-3 py-2 bg-gray-800 rounded" />
        <input name="password" type="password" placeholder="Password" className="px-3 py-2 bg-gray-800 rounded" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className="px-4 py-2 bg-accent text-black rounded">Log in</button>
      </form>
      <p className="mt-4 text-sm">Don't have an account? <a href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-accent">Register</a></p>
    </section>
  )
}
