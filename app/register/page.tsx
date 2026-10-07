import RegisterForm from '../../components/RegisterForm'

export default function RegisterPage({ searchParams }: { searchParams?: { redirectTo?: string } }) {
  const requestedRedirect = searchParams?.redirectTo
  const redirectTo = requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : '/account'

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Create an account</h1>
      <RegisterForm redirectTo={redirectTo} />
      <p className="mt-4 text-sm">Already have an account? <a href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-accent">Log in</a></p>
    </section>
  )
}
