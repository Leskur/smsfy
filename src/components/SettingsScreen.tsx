import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { copy, statusLabel } from '../lib/copy'
import { NTFY_ENABLED } from '../lib/features'
import { useInboxStore } from '../store/inbox'
import { useSettingsStore } from '../store/settings'
import type { GotifySettings, NtfySettings, ThemePreference } from '../types'

interface Props {
  open: boolean
  onBack: () => void
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: copy.themeSystem },
  { value: 'light', label: copy.themeLight },
  { value: 'dark', label: copy.themeDark },
]

function normalizeGotify(next: GotifySettings): GotifySettings {
  return {
    ...next,
    baseUrl: next.baseUrl.trim().replace(/\/+$/, ''),
    clientToken: next.clientToken.trim(),
  }
}

function normalizeNtfy(next: NtfySettings): NtfySettings {
  return {
    ...next,
    serverUrl: next.serverUrl.trim().replace(/\/+$/, ''),
    topics: next.topics.trim(),
    accessToken: next.accessToken.trim(),
  }
}

function Switch({
  checked,
  onChange,
  tabIndex,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  tabIndex: number
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`settings-switch${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={disabled ? -1 : tabIndex}
      onClick={() => {
        if (disabled) return
        onChange(!checked)
      }}
    >
      <span className="settings-switch-knob" aria-hidden />
    </button>
  )
}

export function SettingsScreen({ open, onBack }: Props) {
  const gotify = useSettingsStore((s) => s.gotify)
  const ntfy = useSettingsStore((s) => s.ntfy)
  const theme = useSettingsStore((s) => s.theme)
  const setGotify = useSettingsStore((s) => s.setGotify)
  const setNtfy = useSettingsStore((s) => s.setNtfy)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const status = useInboxStore((s) => s.status)

  const [draftGotify, setDraftGotify] = useState<GotifySettings>(gotify)
  const [draftNtfy, setDraftNtfy] = useState<NtfySettings>(ntfy)
  const [showGotifyToken, setShowGotifyToken] = useState(false)
  const [showNtfyToken, setShowNtfyToken] = useState(false)
  const draftGotifyRef = useRef(draftGotify)
  const draftNtfyRef = useRef(draftNtfy)
  draftGotifyRef.current = draftGotify
  draftNtfyRef.current = draftNtfy

  const tab = open ? 0 : -1

  useEffect(() => {
    if (open) {
      setDraftGotify(gotify)
      setDraftNtfy(ntfy)
      setShowGotifyToken(false)
      setShowNtfyToken(false)
    }
  }, [open, gotify, ntfy])

  function commitGotify(next: GotifySettings) {
    const normalized = normalizeGotify(next)
    setDraftGotify(normalized)
    setGotify(normalized)
  }

  function commitNtfy(next: NtfySettings) {
    const normalized = normalizeNtfy(next)
    setDraftNtfy(normalized)
    setNtfy(normalized)
  }

  function flushAndBack() {
    commitGotify(draftGotifyRef.current)
    if (NTFY_ENABLED) commitNtfy(draftNtfyRef.current)
    onBack()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        commitGotify(draftGotifyRef.current)
        if (NTFY_ENABLED) commitNtfy(draftNtfyRef.current)
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onBack, setGotify, setNtfy])

  return (
    <div
      className="settings-screen"
      aria-hidden={!open}
      inert={open ? undefined : true}
    >
      <button
        type="button"
        className="settings-backdrop"
        aria-label={copy.settingsCloseAria}
        tabIndex={tab}
        onClick={flushAndBack}
      />
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="settings-form-shell">
          <header className="settings-header">
            <button
              type="button"
              className="back-btn"
              onClick={flushAndBack}
              aria-label={copy.backAria}
              tabIndex={tab}
            >
              <ChevronLeft size={20} strokeWidth={2.5} aria-hidden />
            </button>
            <h1 id="settings-title" className="settings-title">
              {copy.settingsTitle}
            </h1>
          </header>

          <div className="settings-form">
            <section className="settings-group" aria-label={copy.themeLegend}>
              <h2 className="settings-group-title">{copy.themeLegend}</h2>
              <div className="settings-group-card">
                <div className="settings-row settings-row-stack">
                  <div
                    className="theme-segment"
                    role="radiogroup"
                    aria-label={copy.themeAria}
                  >
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={theme === option.value}
                        className={`theme-segment-btn${theme === option.value ? ' active' : ''}`}
                        onClick={() => setTheme(option.value)}
                        tabIndex={tab}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-group" aria-label={copy.gotifyLegend}>
              <h2 className="settings-group-title">{copy.gotifyLegend}</h2>
              <div className="settings-group-card">
                <div className="settings-row">
                  <span className="settings-row-label">{copy.gotifyEnable}</span>
                  <Switch
                    checked={draftGotify.enabled}
                    onChange={(enabled) =>
                      commitGotify({ ...draftGotify, enabled })
                    }
                    tabIndex={tab}
                    label={copy.gotifyEnable}
                  />
                </div>
                <label className="settings-row settings-row-field">
                  <span className="settings-row-label">{copy.gotifyServer}</span>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder="https://gotify.example.com"
                    value={draftGotify.baseUrl}
                    onChange={(e) =>
                      setDraftGotify((s) => ({ ...s, baseUrl: e.target.value }))
                    }
                    onBlur={() => commitGotify(draftGotifyRef.current)}
                    autoComplete="off"
                    tabIndex={tab}
                  />
                </label>
                <div className="settings-row settings-row-field">
                  <span className="settings-row-label">{copy.gotifyToken}</span>
                  <div className="settings-input-wrap">
                    <input
                      type={showGotifyToken ? 'text' : 'password'}
                      className="settings-input"
                      placeholder="Client token"
                      value={draftGotify.clientToken}
                      onChange={(e) =>
                        setDraftGotify((s) => ({
                          ...s,
                          clientToken: e.target.value,
                        }))
                      }
                      onBlur={() => commitGotify(draftGotifyRef.current)}
                      autoComplete="off"
                      spellCheck={false}
                      tabIndex={tab}
                    />
                    <button
                      type="button"
                      className="settings-input-reveal"
                      aria-label={
                        showGotifyToken
                          ? copy.gotifyTokenHide
                          : copy.gotifyTokenShow
                      }
                      aria-pressed={showGotifyToken}
                      tabIndex={tab}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowGotifyToken((v) => !v)}
                    >
                      {showGotifyToken ? (
                        <EyeOff size={18} strokeWidth={2} aria-hidden />
                      ) : (
                        <Eye size={18} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {draftGotify.enabled ? (
                <p className="settings-footer-hint pipe-status">
                  {copy.statusLabel}：{statusLabel(status.gotify)}
                  {status.gotifyError ? ` — ${status.gotifyError}` : ''}
                </p>
              ) : null}
            </section>

            <section
              className={`settings-group${NTFY_ENABLED ? '' : ' is-disabled'}`}
              aria-label={copy.ntfyLegend}
            >
              <h2 className="settings-group-title">{copy.ntfyLegend}</h2>
              <div
                className="settings-group-card"
                inert={NTFY_ENABLED ? undefined : true}
              >
                <div className="settings-row">
                  <span className="settings-row-label">{copy.ntfyEnable}</span>
                  <Switch
                    checked={NTFY_ENABLED ? draftNtfy.enabled : false}
                    onChange={(enabled) =>
                      commitNtfy({ ...draftNtfy, enabled })
                    }
                    tabIndex={tab}
                    label={copy.ntfyEnable}
                    disabled={!NTFY_ENABLED}
                  />
                </div>
                <label className="settings-row settings-row-field">
                  <span className="settings-row-label">{copy.ntfyServer}</span>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder="https://ntfy.sh"
                    value={draftNtfy.serverUrl}
                    onChange={(e) =>
                      setDraftNtfy((s) => ({ ...s, serverUrl: e.target.value }))
                    }
                    onBlur={() => {
                      if (NTFY_ENABLED) commitNtfy(draftNtfyRef.current)
                    }}
                    autoComplete="off"
                    tabIndex={NTFY_ENABLED ? tab : -1}
                    disabled={!NTFY_ENABLED}
                  />
                </label>
                <label className="settings-row settings-row-field">
                  <span className="settings-row-label">{copy.ntfyTopic}</span>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="sms-gateway"
                    value={draftNtfy.topics}
                    onChange={(e) =>
                      setDraftNtfy((s) => ({ ...s, topics: e.target.value }))
                    }
                    onBlur={() => {
                      if (NTFY_ENABLED) commitNtfy(draftNtfyRef.current)
                    }}
                    tabIndex={NTFY_ENABLED ? tab : -1}
                    disabled={!NTFY_ENABLED}
                  />
                </label>
                <div className="settings-row settings-row-field">
                  <span className="settings-row-label">{copy.ntfyToken}</span>
                  <div className="settings-input-wrap">
                    <input
                      type={showNtfyToken ? 'text' : 'password'}
                      className="settings-input"
                      placeholder="Access token（可选）"
                      value={draftNtfy.accessToken ?? ''}
                      onChange={(e) =>
                        setDraftNtfy((s) => ({
                          ...s,
                          accessToken: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (NTFY_ENABLED) commitNtfy(draftNtfyRef.current)
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      tabIndex={NTFY_ENABLED ? tab : -1}
                      disabled={!NTFY_ENABLED}
                    />
                    <button
                      type="button"
                      className="settings-input-reveal"
                      aria-label={
                        showNtfyToken
                          ? copy.ntfyTokenHide
                          : copy.ntfyTokenShow
                      }
                      aria-pressed={showNtfyToken}
                      tabIndex={NTFY_ENABLED ? tab : -1}
                      disabled={!NTFY_ENABLED}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowNtfyToken((v) => !v)}
                    >
                      {showNtfyToken ? (
                        <EyeOff size={18} strokeWidth={2} aria-hidden />
                      ) : (
                        <Eye size={18} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {NTFY_ENABLED && draftNtfy.enabled ? (
                <p className="settings-footer-hint pipe-status">
                  {copy.statusLabel}：{statusLabel(status.ntfy)}
                  {status.ntfyError ? ` — ${status.ntfyError}` : ''}
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
