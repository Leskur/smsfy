import { create } from 'zustand'
import { copy } from '../lib/copy'
import {
  deleteMessagesUpstream,
  type DeleteUpstreamResult,
} from '../lib/deleteConversation'
import { normalizePeer } from '../lib/ids'
import {
  deleteMirroredMessages,
  deleteMirroredThreadData,
  loadMirroredInbox,
  putHiddenMessages,
  putHiddenPeer,
  putMirroredGotifyApps,
  putMirroredMessages,
  putMirroredThreads,
  replaceMirroredAfterBackendClear,
} from '../lib/offlineDb'
import { useSettingsStore } from './settings'
import type { ConnectionStatus, Message, SmsThread } from '../types'

interface InboxState {
  threads: Record<string, SmsThread>
  messages: Record<string, Message>
  /** peerKey → hiddenAt — local delete authority */
  hiddenPeers: Record<string, number>
  /** message id → hiddenAt — suppress single-message reflux */
  hiddenMessages: Record<string, number>
  /** Gotify application id → display name (卡1 / 卡2 …) */
  gotifyApps: Record<number, string>
  selectedId: string | null
  status: ConnectionStatus
  loading: boolean
  lastError?: string
  /** True after IndexedDB mirror has been applied (or failed open). */
  offlineReady: boolean
  select: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setStatus: (patch: Partial<ConnectionStatus>) => void
  setError: (error?: string) => void
  setGotifyApps: (apps: Record<number, string>) => void
  /** `live: true` = WS / SSE push — mark unread when thread is not open. */
  upsertMessages: (items: Message[], opts?: { live?: boolean }) => void
  removeMessagesByIds: (ids: string[]) => void
  /** Apply ntfy message_delete (sequence id = original message id when unset). */
  applyNtfyDelete: (sequenceId: string) => void
  markRead: (threadId: string) => void
  clearBackend: (backend: 'gotify' | 'ntfy' | 'demo') => void
  /** Hide peer locally, clear thread, best-effort upstream delete. */
  deleteConversation: (threadId: string) => Promise<DeleteUpstreamResult | null>
  /** Hide messages locally + best-effort upstream delete. */
  deleteMessages: (ids: string[]) => Promise<DeleteUpstreamResult | null>
  hydrateFromOffline: () => Promise<void>
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

function messagePeerKey(msg: Message): string {
  return normalizePeer(msg.peer)
}

function rebuildFromMessages(
  messages: Record<string, Message>,
  selectedId: string | null,
  hiddenPeers: Record<string, number>,
): {
  threads: Record<string, SmsThread>
  selectedId: string | null
} {
  const threads: Record<string, SmsThread> = {}
  const sorted = Object.values(messages).sort((a, b) => a.date - b.date)

  for (const msg of sorted) {
    if (hiddenPeers[messagePeerKey(msg)]) continue
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

function mirrorQuietly(task: Promise<void>) {
  void task.catch(() => {
    /* offline mirror is best-effort */
  })
}

export const useInboxStore = create<InboxState>((set, get) => ({
  threads: {},
  messages: {},
  hiddenPeers: {},
  hiddenMessages: {},
  gotifyApps: {},
  selectedId: null,
  status: { gotify: 'idle', ntfy: 'idle' },
  loading: false,
  offlineReady: false,

  select: (id) => {
    set({ selectedId: id })
    if (id) get().markRead(id)
  },

  setLoading: (loading) => set({ loading }),
  setError: (lastError) => set({ lastError }),
  setStatus: (patch) =>
    set((state) => ({ status: { ...state.status, ...patch } })),

  setGotifyApps: (gotifyApps) => {
    set({ gotifyApps })
    mirrorQuietly(putMirroredGotifyApps(gotifyApps))
  },

  upsertMessages: (items, opts) => {
    const live = opts?.live === true
    const added: Message[] = []
    const touchedThreads = new Map<string, SmsThread>()

    set((state) => {
      const messages = { ...state.messages }
      const threads = { ...state.threads }
      let changed = false

      for (const item of items) {
        if (messages[item.id]) continue
        if (state.hiddenMessages[item.id]) continue
        if (state.hiddenPeers[messagePeerKey(item)]) continue

        messages[item.id] = item
        added.push(item)
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

        touchedThreads.set(item.threadId, threads[item.threadId])
      }

      if (!changed) return state
      return { messages, threads }
    })

    if (added.length) {
      mirrorQuietly(putMirroredMessages(added))
      mirrorQuietly(putMirroredThreads([...touchedThreads.values()]))
    }
  },

  removeMessagesByIds: (ids) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    const touchedThreadIds = new Set<string>()
    set((state) => {
      const messages = { ...state.messages }
      for (const id of idSet) {
        const msg = messages[id]
        if (!msg) continue
        touchedThreadIds.add(msg.threadId)
        delete messages[id]
      }

      const threads = { ...state.threads }
      for (const threadId of touchedThreadIds) {
        const remaining = Object.values(messages)
          .filter((msg) => msg.threadId === threadId)
          .sort((a, b) => a.date - b.date)
        if (remaining.length === 0) {
          delete threads[threadId]
          continue
        }
        const prev = threads[threadId]
        const last = remaining[remaining.length - 1]
        threads[threadId] = {
          ...(prev ?? threadFromMessage(last)),
          peer: last.peer?.trim() || prev?.peer || copy.unknownPeer,
          lastMessageAt: last.date,
          lastPreview: last.body.slice(0, 120),
          unread: prev?.unread ?? 0,
        }
      }

      const selectedId =
        state.selectedId && threads[state.selectedId]
          ? state.selectedId
          : null
      return { messages, threads, selectedId }
    })
    mirrorQuietly(deleteMirroredMessages(ids))
    // Persist touched threads that remain; removed threads cleaned via message deletes only —
    // drop empty threads from IDB by rewriting remaining ones after filter.
    const nextThreads = Object.values(get().threads).filter((t) =>
      touchedThreadIds.has(t.id),
    )
    if (nextThreads.length) mirrorQuietly(putMirroredThreads(nextThreads))
    for (const threadId of touchedThreadIds) {
      if (!get().threads[threadId]) {
        mirrorQuietly(deleteMirroredThreadData(threadId))
      }
    }
  },

  applyNtfyDelete: (sequenceId) => {
    const seq = sequenceId.trim()
    if (!seq) return
    const state = get()
    const ids = Object.values(state.messages)
      .filter(
        (msg) =>
          msg.backend === 'ntfy' &&
          (String(msg.remoteId) === seq || msg.id === `ntfy:${seq}`),
      )
      .map((msg) => msg.id)
    if (ids.length) get().removeMessagesByIds(ids)
  },

  markRead: (threadId) => {
    let updated: SmsThread | null = null
    set((state) => {
      const thread = state.threads[threadId]
      if (!thread || thread.unread === 0) return state
      updated = { ...thread, unread: 0 }
      return {
        threads: {
          ...state.threads,
          [threadId]: updated,
        },
      }
    })
    if (updated) mirrorQuietly(putMirroredThreads([updated]))
  },

  clearBackend: (backend) => {
    set((state) => {
      const messages = Object.fromEntries(
        Object.entries(state.messages).filter(([, m]) => m.backend !== backend),
      )
      const rebuilt = rebuildFromMessages(
        messages,
        state.selectedId,
        state.hiddenPeers,
      )
      const gotifyApps = backend === 'gotify' ? {} : state.gotifyApps
      const next = {
        messages,
        ...rebuilt,
        gotifyApps,
      }
      mirrorQuietly(
        replaceMirroredAfterBackendClear({
          backend,
          messages: next.messages,
          threads: next.threads,
          gotifyApps: backend === 'gotify' ? {} : undefined,
        }),
      )
      return next
    })
  },

  deleteConversation: async (threadId) => {
    const state = get()
    const thread = state.threads[threadId]
    if (!thread) return null

    const doomed = Object.values(state.messages).filter(
      (msg) => msg.threadId === threadId,
    )
    const hiddenAt = Date.now()
    const peerKey = thread.peerKey

    set((prev) => {
      const messages = Object.fromEntries(
        Object.entries(prev.messages).filter(([, msg]) => msg.threadId !== threadId),
      )
      const threads = { ...prev.threads }
      delete threads[threadId]
      const hiddenPeers = { ...prev.hiddenPeers, [peerKey]: hiddenAt }
      const selectedId = prev.selectedId === threadId ? null : prev.selectedId
      return { messages, threads, hiddenPeers, selectedId }
    })

    mirrorQuietly(
      (async () => {
        await putHiddenPeer(peerKey, hiddenAt)
        await deleteMirroredThreadData(threadId)
      })(),
    )

    const { gotify, ntfy } = useSettingsStore.getState()
    return deleteMessagesUpstream(doomed, { gotify, ntfy })
  },

  deleteMessages: async (ids) => {
    const unique = [...new Set(ids)].filter(Boolean)
    if (unique.length === 0) return null

    const state = get()
    const doomed = unique
      .map((id) => state.messages[id])
      .filter((msg): msg is Message => Boolean(msg))
    if (doomed.length === 0) return null

    const hiddenAt = Date.now()
    const doomedIds = doomed.map((msg) => msg.id)
    set((prev) => {
      const hiddenMessages = { ...prev.hiddenMessages }
      for (const id of doomedIds) hiddenMessages[id] = hiddenAt
      return { hiddenMessages }
    })
    get().removeMessagesByIds(doomedIds)
    mirrorQuietly(putHiddenMessages(doomedIds, hiddenAt))

    const { gotify, ntfy } = useSettingsStore.getState()
    return deleteMessagesUpstream(doomed, { gotify, ntfy })
  },

  hydrateFromOffline: async () => {
    if (get().offlineReady) return
    try {
      const mirrored = await loadMirroredInbox()
      set((state) => {
        if (state.offlineReady) return state
        const hasMemory = Object.keys(state.messages).length > 0
        if (hasMemory) {
          return {
            offlineReady: true,
            hiddenPeers: {
              ...mirrored.hiddenPeers,
              ...state.hiddenPeers,
            },
            hiddenMessages: {
              ...mirrored.hiddenMessages,
              ...state.hiddenMessages,
            },
          }
        }

        const messages = Object.fromEntries(
          Object.entries(mirrored.messages).filter(
            ([id, msg]) =>
              !mirrored.hiddenMessages[id] &&
              !mirrored.hiddenPeers[messagePeerKey(msg)],
          ),
        )
        const rebuilt = rebuildFromMessages(messages, null, mirrored.hiddenPeers)
        return {
          messages,
          threads: rebuilt.threads,
          gotifyApps: mirrored.gotifyApps,
          hiddenPeers: mirrored.hiddenPeers,
          hiddenMessages: mirrored.hiddenMessages,
          offlineReady: true,
        }
      })
    } catch {
      set({ offlineReady: true })
    }
  },
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
