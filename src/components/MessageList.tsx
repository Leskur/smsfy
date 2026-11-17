import { Check, ChevronUp, MoreVertical, X } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BrandLogo } from './BrandLogo'
import { ContactAvatar } from './ContactAvatar'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { copy, deleteThreadsTitle } from '../lib/copy'
import {
  formatTime,
  spaceMixedScript,
  startsWithHangPunct,
} from '../lib/format'
import { placeActionMenu, pointRect } from '../lib/placeMenu'
import { sortedThreads, useInboxStore } from '../store/inbox'
import {
  settingsConfigured,
  useSettingsStore,
} from '../store/settings'
import { confirmDialog } from '../store/confirm'
import { toast } from '../store/toast'
import type { SmsThread } from '../types'

const SCROLL_TOP_THRESHOLD = 240
const LONG_PRESS_MS = 480
const LONG_PRESS_MOVE_PX = 10

interface Props {
  onOpenSettings: () => void
  demoActive?: boolean
}

interface ListMenuState {
  threadId: string
  peer: string
  peerKey: string
  rect: DOMRect
}

export function MessageList({
  onOpenSettings,
  demoActive = false,
}: Props) {
  const threads = useInboxStore((s) => s.threads)
  const selectedId = useInboxStore((s) => s.selectedId)
  const selectionOwner = useInboxStore((s) => s.selectionOwner)
  const claimSelect = useInboxStore((s) => s.claimSelect)
  const releaseSelect = useInboxStore((s) => s.releaseSelect)
  const status = useInboxStore((s) => s.status)
  const deleteConversation = useInboxStore((s) => s.deleteConversation)
  const gotify = useSettingsStore((s) => s.gotify)
  const ntfy = useSettingsStore((s) => s.ntfy)
  const nav = useAppNavigate()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [menu, setMenu] = useState<ListMenuState | null>(null)
  const [blankMenu, setBlankMenu] = useState<DOMRect | null>(null)
  const [headerMenu, setHeaderMenu] = useState<DOMRect | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const suppressClickRef = useRef(false)

  const items = useMemo(() => sortedThreads(threads), [threads])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setShowScrollTop(el.scrollTop > SCROLL_TOP_THRESHOLD)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [items.length])

  useEffect(() => {
    if (selectionOwner === 'list' || !selecting) return
    setSelecting(false)
    setSelected(new Set())
  }, [selectionOwner, selecting])

  useEffect(() => {
    if (!selecting) return
    setSelected((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (threads[id]) next.add(id)
      }
      return next
    })
  }, [threads, selecting])

  const hardError =
    (status.gotify === 'error' && status.gotifyError) ||
    (status.ntfy === 'error' && status.ntfyError) ||
    undefined

  const hasAny = Object.keys(threads).length > 0
  const configured = settingsConfigured({ gotify, ntfy })

  function openMenu(thread: SmsThread, x: number, y: number) {
    setBlankMenu(null)
    setHeaderMenu(null)
    setMenu({
      threadId: thread.id,
      peer: thread.peer,
      peerKey: thread.peerKey,
      rect: pointRect(x, y),
    })
  }

  function enterSelect(initial: Set<string> = new Set()) {
    claimSelect('list')
    setSelecting(true)
    setSelected(initial)
  }

  function exitSelect() {
    setSelecting(false)
    setSelected(new Set())
    releaseSelect('list')
  }

  function toggleSelected(threadId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(threadId)) next.delete(threadId)
      else next.add(threadId)
      return next
    })
  }

  async function deleteIds(ids: string[]) {
    if (ids.length === 0 || busy) return
    const ok = await confirmDialog({
      title: deleteThreadsTitle(ids.length),
      confirmLabel: copy.dialogDelete,
      cancelLabel: copy.dialogCancel,
      danger: true,
    })
    if (!ok) return

    const closingOpen = Boolean(selectedId && ids.includes(selectedId))
    setBusy(true)
    try {
      let removed = 0
      for (const id of ids) {
        if (deleteConversation(id)) removed += 1
      }
      if (removed > 0) toast(copy.deleteThreadDone)
      exitSelect()
      setMenu(null)
      if (closingOpen) nav.toHome()
    } finally {
      setBusy(false)
    }
  }

  function onItemClick(thread: SmsThread) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (selecting) {
      toggleSelected(thread.id)
      return
    }
    if (selectedId === thread.id) {
      nav.toHome()
      return
    }
    nav.toThread(thread.peerKey)
  }

  return (
    <aside className="inbox-pane">
      <header className="inbox-header">
        {selecting ? (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={exitSelect}
              aria-label={copy.listSelectCancel}
              title={copy.listSelectCancel}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
            <div className="inbox-heading">
              <h1 className="inbox-title">
                {copy.listSelectCount} {selected.size}
              </h1>
            </div>
            <button
              type="button"
              className="text-btn danger"
              disabled={busy || selected.size === 0}
              onClick={() => void deleteIds([...selected])}
            >
              {copy.listSelectDelete}
            </button>
          </>
        ) : (
          <>
            <div className="inbox-heading">
              <h1 className="inbox-title">{copy.inboxTitle}</h1>
              {demoActive ? <p className="demo-note">{copy.demoBanner}</p> : null}
            </div>
            <button
              ref={moreBtnRef}
              type="button"
              className="icon-btn"
              aria-label={copy.threadMoreAria}
              title={copy.threadMoreAria}
              aria-haspopup="menu"
              aria-expanded={headerMenu != null}
              onClick={() => {
                const el = moreBtnRef.current
                if (!el) return
                setMenu(null)
                setBlankMenu(null)
                setHeaderMenu((open) =>
                  open ? null : el.getBoundingClientRect(),
                )
              }}
            >
              <MoreVertical size={18} strokeWidth={2} aria-hidden />
            </button>
          </>
        )}
      </header>

      {hardError && !demoActive ? (
        <div className="status-alerts" role="status">
          <p className="status-alert danger">{hardError}</p>
        </div>
      ) : null}

      <div className="message-scroll-wrap">
        <div
          className="message-scroll"
          ref={scrollRef}
          onContextMenu={(event) => {
            if (!hasAny) return
            if (selecting) {
              event.preventDefault()
              exitSelect()
              setMenu(null)
              setBlankMenu(null)
              setHeaderMenu(null)
              return
            }
            if (
              event.target instanceof Element &&
              event.target.closest('.message-item')
            ) {
              return
            }
            event.preventDefault()
            setMenu(null)
            setHeaderMenu(null)
            setBlankMenu(pointRect(event.clientX, event.clientY))
          }}
        >
          {!hasAny ? (
            <div className="empty-inbox inbox-hero">
              <BrandLogo className="loading-logo" size={56} />
              {configured ? (
                <p className="inbox-hero-title">{copy.emptyListTitle}</p>
              ) : null}
              <p className="muted inbox-hero-hint">
                {configured
                  ? copy.emptyListConfiguredHint
                  : copy.emptyListHint}
              </p>
              {!configured ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => onOpenSettings()}
                >
                  {copy.emptyListCta}
                </button>
              ) : null}
            </div>
          ) : (
            <ul className={`message-list${selecting ? ' is-selecting' : ''}`}>
              {items.map((thread) => (
                <li key={thread.id}>
                  <MessageRow
                    thread={thread}
                    active={!selecting && selectedId === thread.id}
                    selecting={selecting}
                    checked={selected.has(thread.id)}
                    onOpen={() => onItemClick(thread)}
                    onContextMenu={(x, y) => {
                      if (selecting) return
                      openMenu(thread, x, y)
                    }}
                    onLongPress={(x, y) => {
                      if (selecting) return
                      suppressClickRef.current = true
                      openMenu(thread, x, y)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {showScrollTop ? (
          <button
            type="button"
            className="scroll-top-btn"
            onClick={() =>
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }
            aria-label={copy.scrollTopAria}
            title={copy.scrollTopAria}
          >
            <ChevronUp size={20} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {headerMenu ? (
        <InboxMoreMenu
          anchor={headerMenu}
          onClose={() => setHeaderMenu(null)}
          onSelect={() => {
            setHeaderMenu(null)
            enterSelect()
          }}
          onSettings={() => {
            setHeaderMenu(null)
            onOpenSettings()
          }}
        />
      ) : null}

      {menu ? (
        <ListContextMenu
          target={menu}
          onClose={() => setMenu(null)}
          onDelete={() => {
            void deleteIds([menu.threadId])
          }}
          onSelect={() => {
            enterSelect(new Set([menu.threadId]))
            setMenu(null)
          }}
        />
      ) : null}

      {blankMenu ? (
        <BlankSelectMenu
          anchor={blankMenu}
          onClose={() => setBlankMenu(null)}
          onSelect={() => {
            setBlankMenu(null)
            enterSelect()
          }}
        />
      ) : null}
    </aside>
  )
}

function InboxMoreMenu({
  anchor,
  onClose,
  onSelect,
  onSettings,
}: {
  anchor: DOMRect
  onClose: () => void
  onSelect: () => void
  onSettings: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })
  const menuId = useId()
  const close = useEffectEvent(onClose)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const pos = placeActionMenu(anchor, box.width, box.height)
    setStyle({
      position: 'fixed',
      left: pos.left,
      top: pos.top,
      visibility: 'visible',
    })
  }, [anchor])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const el = menuRef.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  return (
    <div
      ref={menuRef}
      id={menuId}
      className="msg-action-pop"
      role="menu"
      style={style}
    >
      <button
        type="button"
        className="msg-action-item"
        role="menuitem"
        onClick={onSelect}
      >
        {copy.listMenuSelect}
      </button>
      <button
        type="button"
        className="msg-action-item"
        role="menuitem"
        onClick={onSettings}
      >
        {copy.settings}
      </button>
    </div>
  )
}

function MessageRow({
  thread,
  active,
  selecting,
  checked,
  onOpen,
  onContextMenu,
  onLongPress,
}: {
  thread: SmsThread
  active: boolean
  selecting: boolean
  checked: boolean
  onOpen: () => void
  onContextMenu: (x: number, y: number) => void
  onLongPress: (x: number, y: number) => void
}) {
  const pressTimer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  function clearPress() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    origin.current = null
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    // Long-press is touch/pen only; PC uses right-click.
    if (event.pointerType === 'mouse') return
    if (selecting) return
    clearPress()
    origin.current = { x: event.clientX, y: event.clientY }
    const x = event.clientX
    const y = event.clientY
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      origin.current = null
      onLongPress(x, y)
    }, LONG_PRESS_MS)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!origin.current || pressTimer.current == null) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
      clearPress()
    }
  }

  return (
    <button
      type="button"
      className={`message-item${active ? ' active' : ''}${
        selecting && checked ? ' is-checked' : ''
      }`}
      onClick={onOpen}
      onContextMenu={(event) => {
        event.preventDefault()
        clearPress()
        if (selecting) {
          // Bubble to scroll area → exit multi-select.
          return
        }
        event.stopPropagation()
        onContextMenu(event.clientX, event.clientY)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
    >
      <span className="avatar-wrap">
        <ContactAvatar />
        {selecting ? (
          <span
            className={`select-check${checked ? ' on' : ''}`}
            aria-hidden
          >
            {checked ? <Check size={14} strokeWidth={2.5} /> : null}
          </span>
        ) : thread.unread > 0 ? (
          <span className="unread-dot" aria-label={copy.unreadAria} />
        ) : null}
      </span>
      <div className="message-meta">
        <div className="message-top">
          <span className="message-title">{thread.peer}</span>
          <span className="message-time">
            {formatTime(thread.lastMessageAt)}
          </span>
        </div>
        <div className="message-bottom">
          <span
            className={`message-preview${
              startsWithHangPunct(thread.lastPreview) ? ' hang-punct' : ''
            }`}
          >
            {thread.lastPreview
              ? spaceMixedScript(thread.lastPreview)
              : ' '}
          </span>
        </div>
      </div>
    </button>
  )
}

function ListContextMenu({
  target,
  onClose,
  onDelete,
  onSelect,
}: {
  target: ListMenuState
  onClose: () => void
  onDelete: () => void
  onSelect: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })
  const menuId = useId()
  const close = useEffectEvent(onClose)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const pos = placeActionMenu(target.rect, box.width, box.height)
    setStyle({
      position: 'fixed',
      left: pos.left,
      top: pos.top,
      visibility: 'visible',
    })
  }, [target])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const el = menuRef.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  return (
    <div
      ref={menuRef}
      id={menuId}
      className="msg-action-pop"
      role="menu"
      style={style}
    >
      <button
        type="button"
        className="msg-action-item"
        role="menuitem"
        onClick={onSelect}
      >
        {copy.listMenuSelect}
      </button>
      <button
        type="button"
        className="msg-action-item is-danger"
        role="menuitem"
        onClick={onDelete}
      >
        {copy.listMenuDelete}
      </button>
    </div>
  )
}

function BlankSelectMenu({
  anchor,
  onClose,
  onSelect,
}: {
  anchor: DOMRect
  onClose: () => void
  onSelect: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })
  const menuId = useId()
  const close = useEffectEvent(onClose)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const pos = placeActionMenu(anchor, box.width, box.height)
    setStyle({
      position: 'fixed',
      left: pos.left,
      top: pos.top,
      visibility: 'visible',
    })
  }, [anchor])

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const el = menuRef.current
      if (!el) return
      if (event.target instanceof Node && el.contains(event.target)) return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  return (
    <div
      ref={menuRef}
      id={menuId}
      className="msg-action-pop"
      role="menu"
      style={style}
    >
      <button
        type="button"
        className="msg-action-item"
        role="menuitem"
        onClick={onSelect}
      >
        {copy.listMenuSelect}
      </button>
    </div>
  )
}
