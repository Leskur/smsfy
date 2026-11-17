import { create } from 'zustand'
import { copy } from '../lib/copy'
import { normalizePeer } from '../lib/ids'
import type { ConnectionStatus, Message, SmsThread } from '../types'

interface InboxState {
  threads: Record<string, SmsThread>
  messages: Record<string, Message>
  /** Gotify application id → display name (卡1 / 卡2 …) */
  gotifyApps: Record<number, string>
  selectedId: string | null
  status: ConnectionStatus
  loading: boolean
  lastError?: string
  select: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setStatus: (patch: Partial<ConnectionStatus>) => void
  setError: (error?: string) => void
  setGotifyApps: (apps: Record<number, string>) => void
  /** `live: true` = WS / SSE push — mark unread when thread is not open. */
  upsertMessages: (items: Message[], opts?: { live?: boolean }) => void
  markRead: (threadId: string) => void
  clearBackend: (backend: 'gotify' | 'ntfy' | 'demo') => void
}

function threadFromMessage(msg: Message): SmsThread {
  const peer = msg.peer?.trim() || copy.unknownPeer
  return {
    id: msg.threadId,
    peerKey: normalizePeer(msg.peer),
    peer,
    lastMessageAt: msg.date,
    lastPreview: msg.body.slice(0, 120),
    unread: 0,
  }
}

function rebuildFromMessages(
  messages: Record<string, Message>,
  selectedId: string | null,
): {
  threads: Record<string, SmsThread>
  selectedId: string | null
} {
  const threads: Record<string, SmsThread> = {}
  const sorted = Object.values(messages).sort((a, b) => a.date - b.date)

  for (const msg of sorted) {
    const prev = threads[msg.threadId]
    if (!prev) {
      threads[msg.threadId] = threadFromMessage(msg)
    } else {
      threads[msg.threadId] = {
        ...prev,
        peer: msg.peer?.trim() || prev.peer,
        lastMessageAt: msg.date,
        lastPreview: msg.body.slice(0, 120),
      }
    }
  }

  const nextSelected = selectedId && threads[selectedId] ? selectedId : null
  return { threads, selectedId: nextSelected }
}

function applyPreview(
  thread: SmsThread,
  msg: Message,
): SmsThread {
  if (msg.date < thread.lastMessageAt) return thread
  return {
    ...thread,
    peer: msg.peer?.trim() || thread.peer,
    lastMessageAt: msg.date,
    lastPreview: msg.body.slice(0, 120),
  }
}

export const useInboxStore = create<InboxState>((set, get) => ({
  threads: {},
  messages: {},
  gotifyApps: {},
  selectedId: null,
  status: { gotify: 'idle', ntfy: 'idle' },
  loading: false,

  select: (id) => {
    set({ selectedId: id })
    if (id) get().markRead(id)
  },

  setLoading: (loading) => set({ loading }),
  setError: (lastError) => set({ lastError }),
  setStatus: (patch) =>
    set((state) => ({ status: { ...state.status, ...patch } })),
  setGotifyApps: (gotifyApps) => set({ gotifyApps }),

  upsertMessages: (items, opts) =>
    set((state) => {
      const live = opts?.live === true
      const messages = { ...state.messages }
      const threads = { ...state.threads }
      let changed = false

      for (const item of items) {
        if (messages[item.id]) continue
        messages[item.id] = item
        changed = true

        const prev = threads[item.threadId]
        if (!prev) {
          threads[item.threadId] = threadFromMessage(item)
        } else {
          threads[item.threadId] = applyPreview(prev, item)
        }

        if (
          live &&
          item.direction === 'in' &&
          state.selectedId !== item.threadId
        ) {
          const thread = threads[item.threadId]
          threads[item.threadId] = {
            ...thread,
            unread: (thread.unread || 0) + 1,
          }
        }
      }

      if (!changed) return state
      return { messages, threads }
    }),

  markRead: (threadId) =>
    set((state) => {
      const thread = state.threads[threadId]
      if (!thread || thread.unread === 0) return state
      return {
        threads: {
          ...state.threads,
          [threadId]: { ...thread, unread: 0 },
        },
      }
    }),

  clearBackend: (backend) =>
    set((state) => {
      const messages = Object.fromEntries(
        Object.entries(state.messages).filter(([, m]) => m.backend !== backend),
      )
      const rebuilt = rebuildFromMessages(messages, state.selectedId)
      return {
        messages,
        ...rebuilt,
        ...(backend === 'gotify' ? { gotifyApps: {} } : null),
      }
    }),
}))

export function sortedThreads(map: Record<string, SmsThread>): SmsThread[] {
  return Object.values(map).sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

export function threadMessages(
  map: Record<string, Message>,
  threadId: string,
): Message[] {
  return Object.values(map)
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.date - b.date)
}
