import { ArrowLeft } from 'lucide-react'
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { copy } from '../lib/copy'
import {
  formatColorOsStamp,
  shouldShowStamp,
  spaceMixedScript,
  splitRichText,
  takeHangPunct,
} from '../lib/format'
import { extractOtp } from '../lib/peer'
import {
  threadMessages,
  useInboxStore,
} from '../store/inbox'
import { toast } from '../store/toast'
import type { Message } from '../types'

type ActionKind = 'otp' | 'url'

interface ActionTarget {
  kind: ActionKind
  value: string
  rect: DOMRect
}

interface Props {
  onBack: () => void
}

export function MessageThread({ onBack }: Props) {
  const selectedId = useInboxStore((s) => s.selectedId)
  const threads = useInboxStore((s) => s.threads)
  const messagesMap = useInboxStore((s) => s.messages)

  const thread = selectedId ? threads[selectedId] : null
  const messages = selectedId
    ? threadMessages(messagesMap, selectedId)
    : []

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length, selectedId])

  if (!thread) {
    return (
      <section className="thread-pane thread-empty">
        <div className="thread-empty-inner">
          <p>{copy.emptyThreadTitle}</p>
          <p className="muted">{copy.emptyThreadHint}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="thread-pane">
      <header className="thread-header">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          aria-label={copy.backAria}
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="thread-peer">{thread.peer}</h1>
      </header>

      <div className="thread-scroll">
        {messages.length === 0 ? (
          <p className="muted thread-placeholder">{copy.emptyThreadMessages}</p>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1]
            const showStamp = shouldShowStamp(msg.date, prev?.date)
            const sourceChanged =
              Boolean(msg.appId) && msg.appId !== prev?.appId
            return (
              <BubbleBlock
                key={msg.id}
                message={msg}
                showStamp={showStamp}
                showSource={showStamp || sourceChanged}
              />
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 局域网 HTTP / 权限拒绝时改用选区复制。
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;padding:0;border:0;'
    document.body.appendChild(area)
    area.focus()
    area.select()
    area.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

function placeActionMenu(rect: DOMRect, width: number, height: number) {
  const gap = 8
  const margin = 10
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = rect.left + rect.width / 2 - width / 2
  left = Math.min(Math.max(margin, left), vw - width - margin)
  let top = rect.bottom + gap
  if (top + height > vh - margin) {
    top = rect.top - height - gap
  }
  top = Math.min(Math.max(margin, top), vh - height - margin)
  return { left, top }
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

function MessageBody({ body }: { body: string }) {
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

function BubbleBlock({
  message,
  showStamp,
  showSource,
}: {
  message: Message
  showStamp: boolean
  showSource: boolean
}) {
  const gotifyApps = useInboxStore((s) => s.gotifyApps)
  const sourceLabel =
    showSource && message.appId != null
      ? gotifyApps[message.appId]
      : undefined

  return (
    <div className="bubble-block">
      {showStamp || sourceLabel ? (
        <time
          className="thread-stamp"
          dateTime={new Date(message.date).toISOString()}
        >
          {showStamp ? formatColorOsStamp(message.date) : null}
          {showStamp && sourceLabel ? ' ' : null}
          {sourceLabel ? (
            <span className="thread-stamp-source">{sourceLabel}</span>
          ) : null}
        </time>
      ) : null}
      <article className="bubble-row in">
        <div className="bubble in">
          <MessageBody body={message.body} />
        </div>
      </article>
    </div>
  )
}
