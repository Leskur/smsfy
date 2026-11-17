import { copy } from './copy'
import { displayPeer, peerThreadId } from './ids'
import { joinUrl, proxiedFetch, toWebSocketUrl } from './proxy'
import type { Message } from '../types'

export interface GotifyMessage {
  id: number
  appid: number
  message: string
  title: string
  priority: number
  date: string
}

export interface GotifyApplication {
  id: number
  name: string
  description?: string
}

interface PagedMessages {
  messages: GotifyMessage[]
  paging?: { next?: string; limit?: number; since?: number; size?: number }
}

export const GOTIFY_WS_FALLBACK_HINT = copy.gotifyWsFallback

const GOTIFY_PAGE_LIMIT = 100
const GOTIFY_MAX_PAGES = 10

export async function fetchGotifyApplications(
  baseUrl: string,
  clientToken: string,
): Promise<GotifyApplication[]> {
  const res = await proxiedFetch(joinUrl(baseUrl, '/application'), {
    headers: { 'X-Gotify-Key': clientToken },
  })
  if (!res.ok) {
    throw new Error(`Gotify /application failed (${res.status})`)
  }
  const data = (await res.json()) as GotifyApplication[]
  return Array.isArray(data) ? data : []
}

export function gotifyAppNameMap(
  apps: GotifyApplication[],
): Record<number, string> {
  const map: Record<number, string> = {}
  for (const app of apps) {
    const name = app.name?.trim()
    if (app.id != null && name) map[app.id] = name
  }
  return map
}

export async function fetchGotifyMessages(
  baseUrl: string,
  clientToken: string,
  limit = GOTIFY_PAGE_LIMIT,
): Promise<GotifyMessage[]> {
  const first = new URL(joinUrl(baseUrl, '/message'))
  first.searchParams.set('limit', String(limit))

  const all: GotifyMessage[] = []
  let nextUrl: string | null = first.toString()
  let pages = 0

  while (nextUrl && pages < GOTIFY_MAX_PAGES) {
    const res = await proxiedFetch(nextUrl, {
      headers: { 'X-Gotify-Key': clientToken },
    })
    if (!res.ok) {
      throw new Error(`Gotify /message failed (${res.status})`)
    }
    const data = (await res.json()) as PagedMessages
    const batch = data.messages ?? []
    all.push(...batch)
    pages += 1
    const next = data.paging?.next?.trim()
    nextUrl = next && batch.length > 0 ? next : null
  }

  return all
}

/** Map Gotify message using the shared pipe: title=phone, message=body. */
export function gotifyMessageToLocal(
  msg: GotifyMessage,
  direction: Message['direction'] = 'in',
): Message {
  return {
    id: `gotify:${msg.id}`,
    threadId: peerThreadId(msg.title),
    backend: 'gotify',
    direction,
    peer: displayPeer(msg.title),
    body: msg.message,
    date: Date.parse(msg.date) || Date.now(),
    remoteId: msg.id,
    appId: msg.appid,
  }
}

export function gotifyStreamUrl(baseUrl: string, clientToken: string): string {
  const wsBase = toWebSocketUrl(baseUrl)
  return `${wsBase}/stream?token=${encodeURIComponent(clientToken)}`
}

export function openGotifyStream(
  baseUrl: string,
  clientToken: string,
  onMessage: (msg: GotifyMessage) => void,
  onStatus: (status: 'open' | 'error' | 'close') => void,
): WebSocket {
  const ws = new WebSocket(gotifyStreamUrl(baseUrl, clientToken))

  ws.onopen = () => onStatus('open')
  ws.onerror = () => onStatus('error')
  ws.onclose = () => onStatus('close')
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(String(event.data)) as GotifyMessage
      if (data?.id != null && data?.appid != null) {
        onMessage(data)
      }
    } catch {
      // ignore non-message frames
    }
  }

  return ws
}
