import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { NTFY_ENABLED } from '../lib/features'
import type {
  AppSettings,
  GotifySettings,
  NtfySettings,
  ThemePreference,
} from '../types'

const defaultGotify: GotifySettings = {
  enabled: false,
  baseUrl: '',
  clientToken: '',
}

const defaultNtfy: NtfySettings = {
  enabled: false,
  serverUrl: 'https://ntfy.sh',
  topics: '',
}

function normalizeTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : 'system'
}

interface SettingsState extends AppSettings {
  setGotify: (patch: Partial<GotifySettings>) => void
  setNtfy: (patch: Partial<NtfySettings>) => void
  setTheme: (theme: ThemePreference) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      gotify: defaultGotify,
      ntfy: defaultNtfy,
      theme: 'system',
      setGotify: (patch) =>
        set((state) => ({ gotify: { ...state.gotify, ...patch } })),
      setNtfy: (patch) =>
        set((state) => ({ ntfy: { ...state.ntfy, ...patch } })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'sms-web-settings',
      partialize: (state) => ({
        gotify: state.gotify,
        ntfy: state.ntfy,
        theme: state.theme,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppSettings>
        return {
          ...current,
          ...p,
          gotify: { ...current.gotify, ...p.gotify },
          ntfy: { ...current.ntfy, ...p.ntfy },
          theme: normalizeTheme(p.theme ?? current.theme),
        }
      },
    },
  ),
)

export function settingsConfigured(settings: {
  gotify: GotifySettings
  ntfy: NtfySettings
}): boolean {
  const g =
    settings.gotify.enabled &&
    Boolean(settings.gotify.baseUrl.trim()) &&
    Boolean(settings.gotify.clientToken.trim())
  const n =
    NTFY_ENABLED &&
    settings.ntfy.enabled &&
    Boolean(settings.ntfy.serverUrl.trim()) &&
    Boolean(settings.ntfy.topics.trim())
  return g || n
}
