import { ChevronUp, Settings } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandLogo } from './BrandLogo'
import { ContactAvatar } from './ContactAvatar'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { copy } from '../lib/copy'
import {
  formatTime,
  spaceMixedScript,
  startsWithHangPunct,
} from '../lib/format'
import { NTFY_ENABLED } from '../lib/features'
import { sortedThreads, useInboxStore } from '../store/inbox'
import {
  settingsConfigured,
  useSettingsStore,
} from '../store/settings'
import type { ConnectionStatus } from '../types'

const SCROLL_TOP_THRESHOLD = 240

interface Props {
  onOpenSettings: () => void
  demoActive?: boolean
}

function backendPending(
  enabled: boolean,
  state: ConnectionStatus['gotify'],
): boolean {
  if (!enabled) return false
  return state === 'idle' || state === 'connecting'
}

export function MessageList({
  onOpenSettings,
  demoActive = false,
}: Props) {
  const threads = useInboxStore((s) => s.threads)
  const selectedId = useInboxStore((s) => s.selectedId)
  const status = useInboxStore((s) => s.status)
  const loading = useInboxStore((s) => s.loading)
  const gotify = useSettingsStore((s) => s.gotify)
  const ntfy = useSettingsStore((s) => s.ntfy)
  const nav = useAppNavigate()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const hardError =
    (status.gotify === 'error' && status.gotifyError) ||
    (status.ntfy === 'error' && status.ntfyError) ||
    undefined

  const hasAny = Object.keys(threads).length > 0
  const configured = settingsConfigured({ gotify, ntfy })
  const syncing =
    configured &&
    (loading ||
      backendPending(gotify.enabled, status.gotify) ||
      (NTFY_ENABLED && backendPending(ntfy.enabled, status.ntfy)))

  return (
    <aside className="inbox-pane">
      <header className="inbox-header">
        <div className="inbox-heading">
          <h1 className="inbox-title">{copy.inboxTitle}</h1>
          {demoActive ? <p className="demo-note">{copy.demoBanner}</p> : null}
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onOpenSettings()}
          aria-label={copy.settingsAria}
          title={copy.settings}
        >
          <Settings size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>

      {hardError && !demoActive ? (
        <div className="status-alerts" role="status">
          <p className="status-alert danger">{hardError}</p>
        </div>
      ) : null}

      <div className="message-scroll-wrap">
        <div className="message-scroll" ref={scrollRef}>
          {!hasAny && syncing && !demoActive ? (
            <div className="empty-inbox inbox-hero" role="status" aria-live="polite">
              <BrandLogo className="loading-logo" size={56} />
              <p className="loading-caption">{copy.loading}</p>
            </div>
          ) : !hasAny ? (
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
            <ul className="message-list">
              {items.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`message-item${selectedId === thread.id ? ' active' : ''}`}
                    onClick={() => nav.toThread(thread.peerKey)}
                  >
                    <ContactAvatar />
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
                            startsWithHangPunct(thread.lastPreview)
                              ? ' hang-punct'
                              : ''
                          }`}
                        >
                          {thread.lastPreview
                            ? spaceMixedScript(thread.lastPreview)
                            : ' '}
                        </span>
                      </div>
                    </div>
                  </button>
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
    </aside>
  )
}
