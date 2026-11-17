import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@fontsource/figtree/700.css'
import App from './App.tsx'
import { applyTheme, readStoredThemePreference } from './lib/theme'
import { useInboxStore } from './store/inbox'
import { useSettingsStore } from './store/settings'
import './index.css'

applyTheme(readStoredThemePreference())

registerSW({ immediate: true })

async function waitSettingsHydrated() {
  if (useSettingsStore.persist.hasHydrated()) return
  await new Promise<void>((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub()
      resolve()
    })
  })
}

void (async () => {
  await Promise.all([
    waitSettingsHydrated(),
    useInboxStore.getState().hydrateFromOffline(),
  ])
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})()
