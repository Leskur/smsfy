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

/** Fallback if `--surface` is not readable yet (matches list / settings). */
const THEME_COLORS: Record<EffectiveTheme, string> = {
  light: '#ffffff',
  dark: '#1a1a1a',
}

function readListBackground(effective: EffectiveTheme): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface')
    .trim()
  return raw || THEME_COLORS[effective]
}

/** Keep OS chrome (status / title bar) aligned with the list background. */
function syncChromeTheme(effective: EffectiveTheme) {
  const color = readListBackground(effective)

  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', color)

  let apple = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  )
  if (!apple) {
    apple = document.createElement('meta')
    apple.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
    document.head.appendChild(apple)
  }
  // iOS: light page → default; dark page → black status bar.
  apple.setAttribute('content', effective === 'dark' ? 'black' : 'default')
}

export function applyTheme(preference: ThemePreference): EffectiveTheme {
  const effective = resolveEffectiveTheme(preference)
  const root = document.documentElement
  root.dataset.theme = effective
  root.style.colorScheme = effective
  syncChromeTheme(effective)
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
