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

export function applyTheme(preference: ThemePreference): EffectiveTheme {
  const effective = resolveEffectiveTheme(preference)
  const root = document.documentElement
  root.dataset.theme = effective
  root.style.colorScheme = effective
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
