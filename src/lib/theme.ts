import type { ThemePreference } from '../types'

export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'sms-web-settings'

export function resolveEffectiveTheme(
  preference: ThemePreference,
): EffectiveTheme {
  if (preference === 'light' || preference === 'dark') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

const THEME_COLORS: Record<EffectiveTheme, string> = {
  light: '#f3f7fc',
  dark: '#111111',
}

function syncThemeColor(effective: EffectiveTheme) {
  const color = THEME_COLORS[effective]
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', color)
}

export function applyTheme(preference: ThemePreference): EffectiveTheme {
  const effective = resolveEffectiveTheme(preference)
  const root = document.documentElement
  root.dataset.theme = effective
  root.style.colorScheme = effective
  syncThemeColor(effective)
  return effective
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'system'
    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } }
    const theme = parsed.state?.theme
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme
    }
  } catch {
    /* ignore corrupt storage */
  }
  return 'system'
}
