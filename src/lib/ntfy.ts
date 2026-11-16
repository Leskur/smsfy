import { displayPeer, parseTopics, peerThreadId } from './ids'
import { joinUrl, proxiedFetch } from './proxy'
import type { Message } from '../types'

export interface NtfyEvent {
  id: string
  time: number
  event: 'open' | 'keepalive' | 'message' | 'poll_request'
  topic: string
  message?: string
  title?: string
  priority?: number
  tags?: string[]
}

export { parseTopics }

export async function fetchNtfyPoll(
  serverUrl: string,
  topics: string[],
  since: string | number = 0,
): Promise<NtfyEvent[]> {
  if (topics.length === 0) return []
  const path = `/${topics.map(encodeURIComponent).join(',')}/json`
  const url = new URL(joinUrl(serverUrl, path))
  url.searchParams.set('poll', '1')
  url.searchParams.set('since', String(since))

  const res = await proxiedFetch(url.toString(), {
    headers: { Accept: 'application/x-ndjson, application/json' },
  })
  if (!res.ok) {
    throw new Error(`ntfy poll failed (${res.status})`)
  }

  const text = await res.text()
  if (!text.trim()) return []

  const events: NtfyEvent[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const event = JSON.parse(trimmed) as NtfyEvent
      if (event.event === 'message') events.push(event)
    } catch {
      // skip malformed NDJSON lines
    }
  }
  return events
}

export function ntfyEventToLocal(event: NtfyEvent): Message {
  return {
    id: `ntfy:${event.id}`,
    threadId: peerThreadId(event.title),
    backend: 'ntfy',
    direction: 'in',
    peer: displayPeer(event.title),
    body: event.message ?? '',
    date: (event.time || 0) * 1000 || Date.now(),
    remoteId: event.id,
  }
}

export function openNtfySse(
  serverUrl: string,
  topics: string[],
  onMessage: (event: NtfyEvent) => void,
  onStatus: (status: 'open' | 'error' | 'close') => void,
): EventSource | null {
  if (topics.length === 0) return null

  const path = `/${topics.map(encodeURIComponent).join(',')}/sse`
  const url = joinUrl(serverUrl, path)
  const source = new EventSource(url)

  source.onopen = () => onStatus('open')
  source.onerror = () => onStatus('error')

  source.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as NtfyEvent
      if (data.event === 'message') {
        onMessage(data)
      }
    } catch {
      // ignore
    }
  }

  return source
}
