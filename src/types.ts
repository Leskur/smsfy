export type BackendKind = 'gotify' | 'ntfy' | 'demo'

export interface GotifySettings {
  enabled: boolean
  baseUrl: string
  clientToken: string
}

export interface NtfySettings {
  enabled: boolean
  serverUrl: string
  /** Comma or newline separated topic names — SMS gateway pipe(s) */
  topics: string
  /** Optional access token for protected topics (`Authorization: Bearer`) */
  accessToken: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface AppSettings {
  gotify: GotifySettings
  ntfy: NtfySettings
  /** Appearance preference; `system` follows OS color scheme. */
  theme: ThemePreference
}

/** One SMS thread with a peer (phone number from message title). */
export interface SmsThread {
  id: string
  /** Normalized peer key (no `peer:` prefix) */
  peerKey: string
  /** Display label — usually the raw title / phone */
  peer: string
  lastMessageAt: number
  lastPreview: string
  unread: number
}

export type MessageDirection = 'in' | 'out'

export interface Message {
  id: string
  threadId: string
  backend: BackendKind
  direction: MessageDirection
  /** Peer phone (from upstream title) */
  peer?: string
  body: string
  date: number
  remoteId?: string | number
  /** Gotify application id (`appid`) for source label lookup */
  appId?: number
  /** Pipe source label (e.g. ntfy topic); shown after the timestamp */
  source?: string
}

export interface ConnectionStatus {
  gotify: 'idle' | 'connecting' | 'live' | 'polling' | 'error'
  ntfy: 'idle' | 'connecting' | 'live' | 'polling' | 'error'
  gotifyError?: string
  ntfyError?: string
}
