/** Return a validated YouTube video ID from a standard share, watch, embed, or Shorts URL. */
export function getYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) return null

    let id: string | null = null
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)
      id = match?.[1] ?? null
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(value: string | null | undefined): string | null {
  const id = getYouTubeVideoId(value)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}
