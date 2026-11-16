import { useEffect } from 'react'
import { applyTheme } from '../lib/theme'
import { useSettingsStore } from '../store/settings'

/** Keep `document.documentElement` in sync with theme preference + OS scheme. */
export function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])
}
