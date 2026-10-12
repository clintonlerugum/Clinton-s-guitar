function cleanFilenamePart(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f/\\<>:"|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
}

function encodeRfc5987(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    '%' + character.charCodeAt(0).toString(16).toUpperCase()
  )
}

export function pdfDownloadHeaders(title: string, artist: string) {
  let stem = [cleanFilenamePart(title), cleanFilenamePart(artist)].filter(Boolean).join(' - ')
  if (!stem) stem = 'guitar-tab'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(stem)) stem = 'tab-' + stem

  const filename = stem + '.pdf'
  const asciiFallback = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '') || 'guitar-tab'

  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="' + asciiFallback + '.pdf"; filename*=UTF-8\'\'' + encodeRfc5987(filename),
    'Cache-Control': 'private, no-store'
  }
}
