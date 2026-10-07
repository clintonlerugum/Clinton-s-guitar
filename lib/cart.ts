export interface CartItem {
  productId: string
  quantity: number
}

export const maxCartQuantity = 2_147_483_647

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseCartCookie(value?: string | null): CartItem[] | null {
  if (!value) return []

  try {
    let decoded = value
    let parsed: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        parsed = JSON.parse(decoded)
        break
      } catch {
        if (attempt === 2) return null
        decoded = decodeURIComponent(decoded)
      }
    }

    if (!Array.isArray(parsed)) return null

    const quantities = new Map<string, number>()
    for (const item of parsed) {
      if (
        !isRecord(item) ||
        typeof item.productId !== 'string' ||
        item.productId.length === 0 ||
        typeof item.quantity !== 'number' ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > maxCartQuantity
      ) {
        return null
      }

      const quantity = (quantities.get(item.productId) ?? 0) + item.quantity
      if (!Number.isSafeInteger(quantity) || quantity > maxCartQuantity) return null
      quantities.set(item.productId, quantity)
    }

    return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }))
  } catch {
    return null
  }
}

export function parseCartCookieHeader(cookieHeader: string): CartItem[] | null {
  const cartCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('cart='))

  return parseCartCookie(cartCookie?.slice('cart='.length))
}
