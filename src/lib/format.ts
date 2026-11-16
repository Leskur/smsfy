import { copy } from './copy'

const zh = 'zh-CN'

/** CJK ideographs commonly mixed with Latin in SMS copy. */
const CJK =
  '\\u2e80-\\u2eff\\u2f00-\\u2fdf\\u3040-\\u30ff\\u3100-\\u312f\\u3200-\\u32ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'

/** Fullwidth opening marks whose left side-bearing looks like indent. */
const HANG_OPEN_RE = /^[【「『（《〈“‘]/

/** True when the first glyph should hang into the bubble padding. */
export function startsWithHangPunct(text: string): boolean {
  return HANG_OPEN_RE.test(text)
}

/** Peel a leading fullwidth open mark for hanging punctuation rendering. */
export function takeHangPunct(text: string): {
  mark: string | null
  rest: string
} {
  if (!startsWithHangPunct(text)) return { mark: null, rest: text }
  return { mark: text[0] ?? null, rest: text.slice(1) }
}

/**
 * Insert a space between CJK and Latin/digit runs (中英文混排).
 * Skips when a space is already present.
 */
export function spaceMixedScript(text: string): string {
  if (!text) return text
  const cjkLatin = new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g')
  const latinCjk = new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g')
  return text.replace(cjkLatin, '$1 $2').replace(latinCjk, '$1 $2')
}

const URL_RE = /https?:\/\/[^\s\u3000-\u303f\uff00-\uffef<>"'）】》」』]+/gi
const TRAILING_PUNCT_RE = /[.,;:!?。，、；：！？]+$/

export type RichTextPart =
  | { type: 'text'; value: string }
  | { type: 'otp'; value: string }
  | { type: 'url'; value: string }

function trimUrl(raw: string): string {
  return raw.replace(TRAILING_PUNCT_RE, '')
}

/** Split display text into plain / OTP / URL runs for bubble rendering. */
export function splitRichText(
  text: string,
  otp: string | null,
): RichTextPart[] {
  if (!text) return []

  type Hit = { start: number; end: number; part: RichTextPart }
  const hits: Hit[] = []

  if (otp) {
    const index = text.indexOf(otp)
    if (index >= 0) {
      hits.push({
        start: index,
        end: index + otp.length,
        part: { type: 'otp', value: otp },
      })
    }
  }

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0] ?? ''
    const value = trimUrl(raw)
    if (!value) continue
    const start = match.index ?? 0
    hits.push({
      start,
      end: start + value.length,
      part: { type: 'url', value },
    })
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end)

  const parts: RichTextPart[] = []
  let cursor = 0
  for (const hit of hits) {
    if (hit.start < cursor) continue
    if (hit.start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, hit.start) })
    }
    parts.push(hit.part)
    cursor = hit.end
  }
  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) })
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}

export function formatTime(ts: number): string {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return date.toLocaleTimeString(zh, { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) return copy.yesterday

  return date.toLocaleDateString(zh, { month: 'short', day: 'numeric' })
}

/** ColorOS-style stamp: `11月10日 下午 2:47` */
export function formatColorOsStamp(ts: number): string {
  if (!ts) return ''
  const date = new Date(ts)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours < 12 ? '上午' : '下午'
  const h12 = hours % 12 || 12
  const mm = String(minutes).padStart(2, '0')

  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  if (sameYear) {
    return `${month}月${day}日 ${period} ${h12}:${mm}`
  }
  return `${date.getFullYear()}年${month}月${day}日 ${period} ${h12}:${mm}`
}

/** @deprecated use formatColorOsStamp for thread */
export function formatThreadTime(ts: number): string {
  return formatColorOsStamp(ts)
}

export function shouldShowStamp(
  current: number,
  previous: number | undefined,
  gapMs = 5 * 60 * 1000,
): boolean {
  if (previous == null) return true
  return Math.abs(current - previous) >= gapMs
}
