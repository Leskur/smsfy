/** Local IndexedDB mirror for inbox (messages + threads + hidden peers). Demo is never stored. */

import type { Message, SmsThread } from '../types'

const DB_NAME = 'smsfy'
const DB_VERSION = 3

const STORE_MESSAGES = 'messages'
const STORE_THREADS = 'threads'
const STORE_META = 'meta'
const STORE_HIDDEN_PEERS = 'hiddenPeers'
const STORE_HIDDEN_MESSAGES = 'hiddenMessages'

export interface HiddenPeerRow {
  peerKey: string
  hiddenAt: number
}

export interface HiddenMessageRow {
  id: string
  hiddenAt: number
}

type MetaRow = { key: string; value: unknown }

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const store = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' })
        store.createIndex('byThreadId', 'threadId', { unique: false })
        store.createIndex('byBackend', 'backend', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_THREADS)) {
        const store = db.createObjectStore(STORE_THREADS, { keyPath: 'id' })
        store.createIndex('byLastMessageAt', 'lastMessageAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_HIDDEN_PEERS)) {
        db.createObjectStore(STORE_HIDDEN_PEERS, { keyPath: 'peerKey' })
      }
      if (!db.objectStoreNames.contains(STORE_HIDDEN_MESSAGES)) {
        db.createObjectStore(STORE_HIDDEN_MESSAGES, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
  return dbPromise
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('indexedDB request failed'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('indexedDB tx failed'))
    tx.onabort = () => reject(tx.error ?? new Error('indexedDB tx aborted'))
  })
}

function persistableMessages(items: Message[]): Message[] {
  return items.filter((item) => item.backend !== 'demo')
}

export async function loadMirroredInbox(): Promise<{
  messages: Record<string, Message>
  threads: Record<string, SmsThread>
  gotifyApps: Record<number, string>
  hiddenPeers: Record<string, number>
  hiddenMessages: Record<string, number>
}> {
  const db = await openDb()
  const tx = db.transaction(
    [
      STORE_MESSAGES,
      STORE_THREADS,
      STORE_META,
      STORE_HIDDEN_PEERS,
      STORE_HIDDEN_MESSAGES,
    ],
    'readonly',
  )
  const [messageRows, threadRows, appsRow, hiddenRows, hiddenMsgRows] =
    await Promise.all([
      reqToPromise(tx.objectStore(STORE_MESSAGES).getAll()) as Promise<Message[]>,
      reqToPromise(tx.objectStore(STORE_THREADS).getAll()) as Promise<
        SmsThread[]
      >,
      reqToPromise(
        tx.objectStore(STORE_META).get('gotifyApps'),
      ) as Promise<MetaRow | undefined>,
      reqToPromise(
        tx.objectStore(STORE_HIDDEN_PEERS).getAll(),
      ) as Promise<HiddenPeerRow[]>,
      reqToPromise(
        tx.objectStore(STORE_HIDDEN_MESSAGES).getAll(),
      ) as Promise<HiddenMessageRow[]>,
    ])
  await txDone(tx)

  const hiddenPeers: Record<string, number> = {}
  for (const row of hiddenRows) {
    hiddenPeers[row.peerKey] = row.hiddenAt
  }

  const hiddenMessages: Record<string, number> = {}
  for (const row of hiddenMsgRows) {
    hiddenMessages[row.id] = row.hiddenAt
  }

  const threadPeerById = new Map(
    threadRows.map((row) => [row.id, row.peerKey] as const),
  )

  const threads: Record<string, SmsThread> = {}
  for (const row of threadRows) {
    if (hiddenPeers[row.peerKey]) continue
    threads[row.id] = row
  }

  const messages: Record<string, Message> = {}
  for (const row of messageRows) {
    if (row.backend === 'demo') continue
    if (hiddenMessages[row.id]) continue
    const peerKey = threadPeerById.get(row.threadId)
    if (peerKey && hiddenPeers[peerKey]) continue
    messages[row.id] = row
  }

  const gotifyApps =
    appsRow &&
    typeof appsRow.value === 'object' &&
    appsRow.value !== null &&
    !Array.isArray(appsRow.value)
      ? (appsRow.value as Record<number, string>)
      : {}

  return { messages, threads, gotifyApps, hiddenPeers, hiddenMessages }
}

export async function putMirroredMessages(items: Message[]): Promise<void> {
  const rows = persistableMessages(items)
  if (rows.length === 0) return
  const db = await openDb()
  const tx = db.transaction(STORE_MESSAGES, 'readwrite')
  const store = tx.objectStore(STORE_MESSAGES)
  for (const row of rows) store.put(row)
  await txDone(tx)
}

export async function putMirroredThreads(items: SmsThread[]): Promise<void> {
  if (items.length === 0) return
  const db = await openDb()
  const tx = db.transaction(STORE_THREADS, 'readwrite')
  const store = tx.objectStore(STORE_THREADS)
  for (const row of items) store.put(row)
  await txDone(tx)
}

export async function putMirroredGotifyApps(
  apps: Record<number, string>,
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_META, 'readwrite')
  tx.objectStore(STORE_META).put({
    key: 'gotifyApps',
    value: apps,
  } satisfies MetaRow)
  await txDone(tx)
}

export async function putHiddenPeer(
  peerKey: string,
  hiddenAt = Date.now(),
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_HIDDEN_PEERS, 'readwrite')
  tx.objectStore(STORE_HIDDEN_PEERS).put({ peerKey, hiddenAt } satisfies HiddenPeerRow)
  await txDone(tx)
}

export async function putHiddenMessages(
  ids: string[],
  hiddenAt = Date.now(),
): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  const tx = db.transaction(STORE_HIDDEN_MESSAGES, 'readwrite')
  const store = tx.objectStore(STORE_HIDDEN_MESSAGES)
  for (const id of ids) {
    store.put({ id, hiddenAt } satisfies HiddenMessageRow)
  }
  await txDone(tx)
}

export async function deleteMirroredThreadData(threadId: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([STORE_MESSAGES, STORE_THREADS], 'readwrite')
  const messageStore = tx.objectStore(STORE_MESSAGES)
  const keys = (await reqToPromise(
    messageStore.index('byThreadId').getAllKeys(threadId),
  )) as IDBValidKey[]
  for (const key of keys) messageStore.delete(key)
  tx.objectStore(STORE_THREADS).delete(threadId)
  await txDone(tx)
}

export async function deleteMirroredMessages(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  const tx = db.transaction(STORE_MESSAGES, 'readwrite')
  const store = tx.objectStore(STORE_MESSAGES)
  for (const id of ids) store.delete(id)
  await txDone(tx)
}

/** After clearBackend: drop a backend’s messages and rewrite thread list. */
export async function replaceMirroredAfterBackendClear(input: {
  backend: Message['backend']
  messages: Record<string, Message>
  threads: Record<string, SmsThread>
  gotifyApps?: Record<number, string>
}): Promise<void> {
  const db = await openDb()
  const stores =
    input.gotifyApps !== undefined
      ? [STORE_MESSAGES, STORE_THREADS, STORE_META]
      : [STORE_MESSAGES, STORE_THREADS]
  const tx = db.transaction(stores, 'readwrite')
  const messageStore = tx.objectStore(STORE_MESSAGES)
  const threadStore = tx.objectStore(STORE_THREADS)

  const existing = (await reqToPromise(
    messageStore.index('byBackend').getAllKeys(input.backend),
  )) as IDBValidKey[]
  for (const key of existing) messageStore.delete(key)

  for (const msg of persistableMessages(Object.values(input.messages))) {
    messageStore.put(msg)
  }

  await reqToPromise(threadStore.clear())
  for (const thread of Object.values(input.threads)) {
    threadStore.put(thread)
  }

  if (input.gotifyApps !== undefined) {
    tx.objectStore(STORE_META).put({
      key: 'gotifyApps',
      value: input.gotifyApps,
    } satisfies MetaRow)
  }

  await txDone(tx)
}
