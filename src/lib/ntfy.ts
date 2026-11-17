import { syncHttpError } from './copy'
import { displayPeer, parseTopics, peerThreadId } from './ids'
import { joinUrl, proxiedFetch } from './proxy'
import type { Message } from '../types'

export interface NtfyEvent {
  id: string
  time: number
  event:
    | 'open'
    | 'keepalive'
    | 'message'
    | 'poll_request'
    | 'message_delete'
    | 'message_clear'
  topic: string
  message?: string
  title?: string
  priority?: number
  tags?: string[]
  /** Present on updates / deletes; equals message id when none was set at publish. */
  sequence_id?: string
}

export { parseTopics }

/** Optional access token → `Authorization: Bearer …` */
export function ntfyAuthHeaders(
  accessToken?: string,
): Record<string, string> {
  const token = accessToken?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * EventSource cannot set headers; ntfy accepts `?auth=` as
 * base64 of the Authorization header value (`Bearer …` / `Basic …`).
 */
export function withNtfyAuthQuery(url: string, accessToken?: string): string {
  const token = accessToken?.trim()
  if (!token) return url
  const next = new URL(url)
  next.searchParams.set('auth', btoa(`Bearer ${token}`))
  return next.toString()
}

export async function fetchNtfyPoll(
  serverUrl: string,
  topics: string[],
  since: string | number = 0,
  accessToken?: string,
): Promise<NtfyEvent[]> {
  if (topics.length === 0) return []
  const path = `/${topics.map(encodeURIComponent).join(',')}/json`
  const url = new URL(joinUrl(serverUrl, path))
  url.searchParams.set('poll', '1')
  url.searchParams.set('since', String(since))

  const res = await proxiedFetch(url.toString(), {
    headers: {
      Accept: 'application/x-ndjson, application/json',
      ...ntfyAuthHeaders(accessToken),
    },
  })
  if (!res.ok) {
    throw new Error(syncHttpError('ntfy', res.status))
  }

  const text = await res.text()
  if (!text.trim()) return []

  const events: NtfyEvent[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const event = JSON.parse(trimmed) as NtfyEvent
      if (event.event === 'message' || event.event === 'message_delete') {
        events.push(event)
      }
    } catch {
      // skip malformed NDJSON lines
    }
  }
  return events
}

/** Best-effort delete; uses message id as sequence id when none was set. */
export async function deleteNtfyMessage(
  serverUrl: string,
  topic: string,
  sequenceId: string,
  accessToken?: string,
): Promise<void> {
  const path = `/${encodeURIComponent(topic)}/${encodeURIComponent(sequenceId)}`
  const res = await proxiedFetch(joinUrl(serverUrl, path), {
    method: 'DELETE',
    headers: {
      ...ntfyAuthHeaders(accessToken),
    },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(syncHttpError('ntfy', res.status))
  }
}

/** Map ntfy message using the shared pipe: title=phone, message=body, topic=source. */
export function ntfyEventToLocal(event: NtfyEvent): Message {
  const topic = event.topic?.trim()
  return {
    id: `ntfy:${event.id}`,
    threadId: peerThreadId(event.title),
    backend: 'ntfy',
    direction: 'in',
    peer: displayPeer(event.title),
    body: event.message ?? '',
    date: (event.time || 0) * 1000 || Date.now(),
    remoteId: event.id,
    source: topic || undefined,
  }
}

export function openNtfySse(
  serverUrl: string,
  topics: string[],
  onMessage: (event: NtfyEvent) => void,
  onStatus: (status: 'open' | 'error' | 'close') => void,
  accessToken?: string,
): EventSource | null {
  if (topics.length === 0) return null

  const path = `/${topics.map(encodeURIComponent).join(',')}/sse`
  const url = withNtfyAuthQuery(joinUrl(serverUrl, path), accessToken)
  const source = new EventSource(url)

  source.onopen = () => onStatus('open')
  source.onerror = () => onStatus('error')

  const handleFrame = (ev: MessageEvent<string>) => {
    try {
      const data = JSON.parse(ev.data) as NtfyEvent
      if (data.event === 'message' || data.event === 'message_delete') {
        onMessage(data)
      }
    } catch {
      // ignore
    }
  }

  // Default frames + named `message_delete` events from ntfy SSE.
  source.onmessage = handleFrame
  source.addEventListener('message_delete', handleFrame as EventListener)

  return source
}
