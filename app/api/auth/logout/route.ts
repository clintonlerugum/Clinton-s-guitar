export async function POST(req: Request) {
  const requestUrl = new URL(req.url)
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const secure = forwardedProto === 'https' || requestUrl.protocol === 'https:'
  const cookie = ['token=', 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
  if (secure) cookie.push('Secure')

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Set-Cookie': cookie.join('; ')
    }
  })
}
