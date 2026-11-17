import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useMatch } from 'react-router-dom'
import {
  LegacyQueryRedirect,
  LegacyThreadRedirect,
} from './components/LegacyQueryRedirect'
import { BrandLogo } from './components/BrandLogo'
import { MessageList } from './components/MessageList'
import { MessageThread } from './components/MessageThread'
import { SettingsScreen } from './components/SettingsScreen'
import { ConfirmHost } from './components/ConfirmHost'
import { ToastHost } from './components/ToastHost'
import { useAppNavigate } from './hooks/useAppNavigate'
import { useApplyTheme } from './hooks/useApplyTheme'
import { useDemoInbox } from './hooks/useDemoInbox'
import { useSync } from './hooks/useSync'
import { peerThreadId } from './lib/ids'
import { SETTINGS_PATH } from './lib/paths'
import { useSettingsStore } from './store/settings'
import { useInboxStore } from './store/inbox'

function AppShell() {
  const threadMatch = useMatch('/sms/:peer')
  const settingsOpen = Boolean(useMatch(SETTINGS_PATH))
  const select = useInboxStore((s) => s.select)
  const offlineReady = useInboxStore((s) => s.offlineReady)
  const nav = useAppNavigate()
  useApplyTheme()
  const { demoActive } = useDemoInbox()
  // Wait for IndexedDB mirror so cold start is not wiped by an empty sync race.
  useSync(!demoActive && offlineReady)

  const threads = useInboxStore((s) => s.threads)
  const peerParam = threadMatch?.params.peer
    ? decodeURIComponent(threadMatch.params.peer)
    : null
  const routeSelectedId = peerParam ? peerThreadId(peerParam) : null
  const showThread = Boolean(threadMatch) && !settingsOpen

  useEffect(() => {
    if (settingsOpen) return
    select(routeSelectedId)
  }, [routeSelectedId, settingsOpen, select])

  useEffect(() => {
    if (!routeSelectedId || settingsOpen) return
    if (!threads[routeSelectedId]) nav.toHome()
  }, [routeSelectedId, threads, settingsOpen, nav])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ',' || event.altKey || event.shiftKey) return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      if (settingsOpen) nav.back()
      else nav.toSettings()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, nav])

  return (
    <div
      className={`app-shell${showThread ? ' thread-open' : ''}${settingsOpen ? ' settings-open' : ''}`}
    >
      <div
        className="inbox-layer"
        aria-hidden={settingsOpen}
        inert={settingsOpen ? true : undefined}
      >
        <MessageList
          onOpenSettings={nav.toSettings}
          demoActive={demoActive}
        />
      </div>
      <div
        className="thread-wrap"
        aria-hidden={!showThread || settingsOpen}
        inert={showThread && !settingsOpen ? undefined : true}
      >
        <MessageThread onBack={nav.toHome} />
      </div>
      <SettingsScreen open={settingsOpen} onBack={nav.back} />
    </div>
  )
}

function BootGate({ children }: { children: ReactNode }) {
  const [settingsReady, setSettingsReady] = useState(() =>
    useSettingsStore.persist.hasHydrated(),
  )
  const offlineReady = useInboxStore((s) => s.offlineReady)
  const hydrateFromOffline = useInboxStore((s) => s.hydrateFromOffline)

  useEffect(() => {
    const finish = () => setSettingsReady(true)
    const unsub = useSettingsStore.persist.onFinishHydration(finish)
    if (useSettingsStore.persist.hasHydrated()) finish()
    return unsub
  }, [])

  useEffect(() => {
    void hydrateFromOffline()
  }, [hydrateFromOffline])

  if (!settingsReady || !offlineReady) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <BrandLogo className="loading-logo" size={64} />
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <>
      <BootGate>
        <LegacyQueryRedirect />
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={null} />
            <Route path="sms/:peer" element={null} />
            <Route path="settings" element={null} />
          </Route>
          <Route path="/c/:peer" element={<LegacyThreadRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BootGate>
      <ToastHost />
      <ConfirmHost />
    </>
  )
}
