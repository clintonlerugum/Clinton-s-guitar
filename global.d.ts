// Minimal local type shims to reduce TypeScript errors when node_modules are not installed.
// These are temporary and should be removed once proper packages (@types/react, next) are installed.

declare module 'react' {
  // minimal default export
  const React: any
  export default React
  export function useState<T>(initial: T): [T, (value: T) => void]
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void
  // minimal named ReactNode type
  export type ReactNode = any
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props?: any, key?: any): any
  export function jsxs(type: any, props?: any, key?: any): any
  export function jsxDEV(type: any, props?: any, key?: any): any
}

declare module 'next' {
  // Minimal Metadata type used in app/layout.tsx
  export type Metadata = { [key: string]: any }
}

declare module 'next/link' {
  export default function Link(props: any): any
}

declare module 'next/navigation' {
  export function useSearchParams(): any
  export function useRouter(): any
  export function usePathname(): any
}

declare module 'next/server' {
  export class NextResponse {
    constructor(body?: any, init?: any)
    static json(data: any, options?: any): any
    static redirect(url: any): any
    cookies: any
  }
  export class NextRequest {
    headers: any
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    // allow any intrinsic elements
    [elemName: string]: any
  }
  interface ElementAttributesProperty { props: any }
  interface ElementChildrenAttribute { children: any }
}
