import { useEffect } from 'react'
import { applyTheme, desktopSplitMediaQuery } from '../lib/theme'
import { useSettingsStore } from '../store/settings'

/** Keep `document.documentElement` in sync with theme preference + OS scheme. */
export function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)

    const split = window.matchMedia(desktopSplitMediaQuery())
    const onSplitChange = () => applyTheme(theme)
    split.addEventListener('change', onSplitChange)

    if (theme === 'system') {
      const scheme = window.matchMedia('(prefers-color-scheme: dark)')
      const onSchemeChange = () => applyTheme('system')
      scheme.addEventListener('change', onSchemeChange)
      return () => {
        split.removeEventListener('change', onSplitChange)
        scheme.removeEventListener('change', onSchemeChange)
      }
    }

    return () => split.removeEventListener('change', onSplitChange)
  }, [theme])
}
