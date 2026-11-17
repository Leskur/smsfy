/** Peer phone from pipe `title` → thread key (Gotify / ntfy). */

import { copy } from './copy'

export function normalizePeer(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return 'unknown'

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    // Non-numeric title — still group by a stable lowercase key
    return trimmed.toLowerCase().replace(/\s+/g, ' ')
  }

  return hasPlus ? `+${digits}` : digits
}

export function displayPeer(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return copy.unknownPeer
  return trimmed
}

/** Thread id: `peer:<normalized>` — not gotify app / ntfy topic. */
export function peerThreadId(title: string | undefined | null): string {
  return `peer:${normalizePeer(title)}`
}

export function parseTopics(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}
