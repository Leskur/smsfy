import { Check, ChevronLeft, MoreVertical, X } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BrandLogo } from './BrandLogo'
import { copyText } from '../lib/clipboard'
import {
  copy,
  deleteMessagesTitle,
  deleteThreadsTitle,
} from '../lib/copy'
import {
  formatColorOsStamp,
  shouldShowStamp,
  spaceMixedScript,
  splitRichText,
  takeHangPunct,
} from '../lib/format'
import { placeActionMenu, pointRect } from '../lib/placeMenu'
import { extractOtp } from '../lib/peer'
import {
  threadMessages,
  useInboxStore,
} from '../store/inbox'
import { confirmDialog } from '../store/confirm'
import { toast } from '../store/toast'
import type { Message } from '../types'

const LONG_PRESS_MS = 480
const LONG_PRESS_MOVE_PX = 10

function selectElementText(el: HTMLElement) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}

function clearDocSelection() {
  window.getSelection()?.removeAllRanges()
}

type ActionKind = 'otp' | 'url'

interface ActionTarget {
  kind: ActionKind
  value: string
  rect: DOMRect
}

interface BubbleMenuState {
  messageId: string
  body: string
  rect: DOMRect
}

interface Props {
  onBack: () => void
}

export function MessageThread({ onBack }: Props) {
  const selectedId = useInboxStore((s) => s.selectedId)
  const threads = useInboxStore((s) => s.threads)
  const messagesMap = useInboxStore((s) => s.messages)
  const selectionOwner = useInboxStore((s) => s.selectionOwner)
  const claimSelect = useInboxStore((s) => s.claimSelect)
  const releaseSelect = useInboxStore((s) => s.releaseSelect)
  const deleteConversation = useInboxStore((s) => s.deleteConversation)
  const deleteMessages = useInboxStore((s) => s.deleteMessages)
  const [deleting, setDeleting] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [menu, setMenu] = useState<BubbleMenuState | null>(null)
  const [headerMenu, setHeaderMenu] = useState<DOMRect | null>(null)
  const [blankMenu, setBlankMenu] = useState<DOMRect | null>(null)
  const suppressClickRef = useRef(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  const thread = selectedId ? threads[selectedId] : null
  const messages = selectedId
    ? threadMessages(messagesMap, selectedId)
    : []

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length, selectedId])

  useEffect(() => {
    setSelecting(false)
    setSelected(new Set())
    setMenu(null)
    setHeaderMenu(null)
    setBlankMenu(null)
    releaseSelect('thread')
  }, [selectedId, releaseSelect])

  useEffect(() => {
    if (selectionOwner === 'thread' || !selecting) return
    setSelecting(false)
    setSelected(new Set())
  }, [selectionOwner, selecting])

  useEffect(() => {
    if (!selecting) return
    setSelected((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (messagesMap[id]) next.add(id)
      }
      return next
    })
  }, [messagesMap, selecting])

  function enterSelect(initial: Set<string> = new Set()) {
    claimSelect('thread')
    setSelecting(true)
    setSelected(initial)
  }

  function exitSelect() {
    setSelecting(false)
    setSelected(new Set())
    releaseSelect('thread')
  }

  function toggleSelected(messageId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  async function onDeleteThread() {
    if (!selectedId || deleting || selecting) return
    const ok = await confirmDialog({
      title: deleteThreadsTitle(1),
      confirmLabel: copy.dialogDelete,
      cancelLabel: copy.dialogCancel,
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      const result = await deleteConversation(selectedId)
      if (!result) return
      const failed = result.gotifyFailed + result.ntfyFailed
      toast(failed > 0 ? copy.deleteThreadPartial : copy.deleteThreadDone)
      onBack()
    } finally {
      setDeleting(false)
    }
  }

  async function deleteMessageIds(ids: string[]) {
    if (ids.length === 0 || deleting) return
    const ok = await confirmDialog({
      title: deleteMessagesTitle(ids.length),
      confirmLabel: copy.dialogDelete,
      cancelLabel: copy.dialogCancel,
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      const result = await deleteMessages(ids)
      if (!result) return
      const failed = result.gotifyFailed + result.ntfyFailed
      toast(failed > 0 ? copy.deleteThreadPartial : copy.deleteThreadDone)
      exitSelect()
      setMenu(null)
    } finally {
      setDeleting(false)
    }
  }

  if (!thread) {
    return (
      <section className="thread-pane thread-empty" aria-hidden>
        <div className="thread-empty-inner">
          <BrandLogo className="loading-logo thread-empty-logo" size={64} />
        </div>
      </section>
    )
  }

  return (
    <section className="thread-pane">
      <header className="thread-header">
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
            <h1 className="thread-peer">
              {copy.listSelectCount} {selected.size}
            </h1>
            <button
              type="button"
              className="text-btn danger"
              disabled={deleting || selected.size === 0}
              onClick={() => void deleteMessageIds([...selected])}
            >
              {copy.listSelectDelete}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="back-btn"
              onClick={onBack}
              aria-label={copy.backAria}
            >
              <ChevronLeft size={20} strokeWidth={2.5} aria-hidden />
            </button>
            <h1 className="thread-peer">{thread.peer}</h1>
            <button
              ref={moreBtnRef}
              type="button"
              className="icon-btn"
              disabled={deleting}
              aria-label={copy.threadMoreAria}
              title={copy.threadMoreAria}
              aria-haspopup="menu"
              aria-expanded={headerMenu != null}
              onClick={() => {
                const el = moreBtnRef.current
                if (!el) return
                setMenu(null)
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

      <div
        className={`thread-scroll${selecting ? ' is-selecting' : ''}`}
        onContextMenu={(event) => {
          if (selecting) {
            event.preventDefault()
            exitSelect()
            setMenu(null)
            setHeaderMenu(null)
            setBlankMenu(null)
            return
          }
          if (event.target instanceof Element && event.target.closest('.bubble')) {
            return
          }
          event.preventDefault()
          setMenu(null)
          setHeaderMenu(null)
          setBlankMenu(pointRect(event.clientX, event.clientY))
        }}
      >
        {messages.length === 0 ? (
          <p className="muted thread-placeholder">{copy.emptyThreadMessages}</p>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1]
            const showStamp = shouldShowStamp(msg.date, prev?.date)
            const sourceChanged = messageSourceKey(msg) !== messageSourceKey(prev)
            return (
              <BubbleBlock
                key={msg.id}
                message={msg}
                showStamp={showStamp}
                showSource={showStamp || sourceChanged}
                selecting={selecting}
                checked={selected.has(msg.id)}
                onOpenMenu={(x, y) => {
                  if (selecting) return
                  setMenu({
                    messageId: msg.id,
                    body: msg.body,
                    rect: pointRect(x, y),
                  })
                }}
                onLongPress={(x, y) => {
                  if (selecting) return
                  suppressClickRef.current = true
                  setMenu({
                    messageId: msg.id,
                    body: msg.body,
                    rect: pointRect(x, y),
                  })
                }}
                onSelectToggle={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false
                    return
                  }
                  if (selecting) toggleSelected(msg.id)
                }}
              />
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {headerMenu ? (
        <HeaderMoreMenu
          anchor={headerMenu}
          onClose={() => setHeaderMenu(null)}
          onSelect={() => {
            setHeaderMenu(null)
            enterSelect()
          }}
          onDelete={() => {
            setHeaderMenu(null)
            void onDeleteThread()
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

      {menu ? (
        <BubbleContextMenu
          target={menu}
          onClose={() => {
            clearDocSelection()
            setMenu(null)
          }}
          onCopy={async () => {
            const ok = await copyText(menu.body)
            if (ok) toast(copy.toastCopied)
            clearDocSelection()
            setMenu(null)
          }}
          onDelete={() => {
            clearDocSelection()
            void deleteMessageIds([menu.messageId])
          }}
          onSelect={() => {
            clearDocSelection()
            enterSelect(new Set([menu.messageId]))
            setMenu(null)
          }}
        />
      ) : null}
    </section>
  )
}

function useAnchoredMenu(anchor: DOMRect, onClose: () => void) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })
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

  return { menuRef, style }
}

function HeaderMoreMenu({
  anchor,
  onClose,
  onSelect,
  onDelete,
}: {
  anchor: DOMRect
  onClose: () => void
  onSelect: () => void
  onDelete: () => void
}) {
  const menuId = useId()
  const { menuRef, style } = useAnchoredMenu(anchor, onClose)

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
  const menuId = useId()
  const { menuRef, style } = useAnchoredMenu(anchor, onClose)

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

function MsgActionMenu({
  target,
  onClose,
}: {
  target: ActionTarget
  onClose: () => void
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

  async function handleCopy() {
    const ok = await copyText(target.value)
    if (ok) toast(copy.toastCopied)
    close()
  }

  function handleOpen() {
    window.open(target.value, '_blank', 'noopener,noreferrer')
    close()
  }

  return (
    <div
      ref={menuRef}
      id={menuId}
      className="msg-action-pop"
      role="menu"
      style={style}
    >
      {target.kind === 'url' ? (
        <button
          type="button"
          className="msg-action-item"
          role="menuitem"
          onClick={handleOpen}
        >
          {copy.actionOpenLink}
        </button>
      ) : null}
      <button
        type="button"
        className="msg-action-item"
        role="menuitem"
        onClick={() => {
          void handleCopy()
        }}
      >
        {target.kind === 'otp' ? copy.actionCopyCode : copy.actionCopyLink}
      </button>
    </div>
  )
}

function BubbleContextMenu({
  target,
  onClose,
  onCopy,
  onDelete,
  onSelect,
}: {
  target: BubbleMenuState
  onClose: () => void
  onCopy: () => void
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
        onClick={onCopy}
      >
        {copy.listMenuCopy}
      </button>
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

function MessageBody({
  body,
  interactive,
}: {
  body: string
  interactive: boolean
}) {
  const { mark: hangMark, rest } = takeHangPunct(body)
  const spaced = spaceMixedScript(rest)
  const code = extractOtp(spaced)
  const parts = splitRichText(spaced, code)
  const [action, setAction] = useState<ActionTarget | null>(null)

  function openAction(
    kind: ActionKind,
    value: string,
    event: ReactMouseEvent<HTMLElement>,
  ) {
    if (!interactive) return
    event.preventDefault()
    event.stopPropagation()
    setAction({
      kind,
      value,
      rect: event.currentTarget.getBoundingClientRect(),
    })
  }

  return (
    <>
      <p className="bubble-body">
        {hangMark ? <span className="hang-punct-mark">{hangMark}</span> : null}
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={`t-${index}`}>{part.value}</span>
          }
          if (part.type === 'url') {
            return (
              <button
                key={`u-${index}`}
                type="button"
                className="msg-link"
                aria-label={`${copy.openLinkAria} ${part.value}`}
                aria-haspopup="menu"
                disabled={!interactive}
                onClick={(event) => openAction('url', part.value, event)}
              >
                {part.value}
              </button>
            )
          }
          return (
            <button
              key={`o-${index}`}
              type="button"
              className="msg-link is-otp"
              aria-label={`${copy.otpHint} ${part.value}`}
              aria-haspopup="menu"
              disabled={!interactive}
              onClick={(event) => openAction('otp', part.value, event)}
            >
              {part.value}
            </button>
          )
        })}
      </p>
      {action ? (
        <MsgActionMenu target={action} onClose={() => setAction(null)} />
      ) : null}
    </>
  )
}

function messageSourceKey(message: Message | undefined): string {
  if (!message) return ''
  if (message.source) return `source:${message.source}`
  if (message.appId != null) return `app:${message.appId}`
  return ''
}

function BubbleBlock({
  message,
  showStamp,
  showSource,
  selecting,
  checked,
  onOpenMenu,
  onLongPress,
  onSelectToggle,
}: {
  message: Message
  showStamp: boolean
  showSource: boolean
  selecting: boolean
  checked: boolean
  onOpenMenu: (x: number, y: number) => void
  onLongPress: (x: number, y: number) => void
  onSelectToggle: () => void
}) {
  const gotifyApps = useInboxStore((s) => s.gotifyApps)
  const sourceLabel = showSource
    ? message.source ||
      (message.appId != null ? gotifyApps[message.appId] : undefined)
    : undefined
  const bubbleRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const longPressedRef = useRef(false)

  function clearPress() {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    origin.current = null
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Long-press is touch/pen only; PC uses right-click.
    if (event.pointerType === 'mouse') return
    if (selecting) return
    clearPress()
    longPressedRef.current = false
    origin.current = { x: event.clientX, y: event.clientY }
    const x = event.clientX
    const y = event.clientY
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      origin.current = null
      const el = bubbleRef.current
      if (!el) return
      longPressedRef.current = true
      selectElementText(el)
      onLongPress(x, y)
    }, LONG_PRESS_MS)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!origin.current || pressTimer.current == null) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
      clearPress()
    }
  }

  function onPointerUp() {
    clearPress()
    // Finger-up often clears the selection; re-apply after long-press.
    if (longPressedRef.current && bubbleRef.current) {
      selectElementText(bubbleRef.current)
      longPressedRef.current = false
    }
  }

  return (
    <div className={`bubble-block${selecting && checked ? ' is-checked' : ''}`}>
      {showStamp || sourceLabel ? (
        <time
          className="thread-stamp"
          dateTime={new Date(message.date).toISOString()}
        >
          {showStamp ? formatColorOsStamp(message.date) : null}
          {showStamp && sourceLabel ? ' ' : null}
          {sourceLabel ? (
            <span className="thread-stamp-source" title={sourceLabel}>
              {sourceLabel}
            </span>
          ) : null}
        </time>
      ) : null}
      <article className="bubble-row in">
        {selecting ? (
          <span
            className={`select-check${checked ? ' on' : ''}`}
            aria-hidden
          >
            {checked ? <Check size={14} strokeWidth={2.5} /> : null}
          </span>
        ) : null}
        <div
          ref={bubbleRef}
          className={`bubble in${selecting ? ' is-selectable' : ''}`}
          onClick={selecting ? onSelectToggle : undefined}
          onContextMenu={(event) => {
            event.preventDefault()
            clearPress()
            if (selecting) {
              // Bubble to thread scroll → exit multi-select.
              return
            }
            event.stopPropagation()
            onOpenMenu(event.clientX, event.clientY)
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={clearPress}
          onPointerLeave={clearPress}
        >
          <MessageBody body={message.body} interactive={!selecting} />
        </div>
      </article>
    </div>
  )
}
