import { peerThreadId } from './ids'
import type { Message } from '../types'

/** URL `?demo=` → true / false / null (absent). Demo mode is query-only. */
export function readDemoQuery(
  search = typeof window !== 'undefined' ? window.location.search : '',
): boolean | null {
  const raw = new URLSearchParams(search).get('demo')
  if (raw === null) return null
  const v = raw.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false
  return true
}

interface DemoSeed {
  peer: string
  body: string
}

/** Load demo seeds from `/demo-messages.json` only when demo mode is on. */
export async function fetchDemoMessages(now = Date.now()): Promise<Message[]> {
  const res = await fetch('/demo-messages.json', { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`demo messages failed (${res.status})`)
  }
  const seeds = (await res.json()) as DemoSeed[]
  if (!Array.isArray(seeds)) return []

  return seeds.map((seed, index) => ({
    id: `demo:${index + 1}`,
    threadId: peerThreadId(seed.peer),
    backend: 'demo' as const,
    direction: 'in' as const,
    peer: seed.peer,
    body: seed.body,
    date: now - (seeds.length - index) * 8 * 60_000,
  }))
}
