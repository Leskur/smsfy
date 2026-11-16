/** URL helpers + direct browser fetch (Gotify / ntfy must allow CORS). */

export async function proxiedFetch(
  targetUrl: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(targetUrl, init)
}

export function joinUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${trimmed}${suffix}`
}

export function toWebSocketUrl(httpBase: string): string {
  const url = new URL(httpBase)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString().replace(/\/+$/, '')
}
