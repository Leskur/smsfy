import { useEffect, useRef } from 'react'
import { copy } from '../lib/copy'
import {
  fetchGotifyApplications,
  fetchGotifyMessages,
  GOTIFY_WS_FALLBACK_HINT,
  gotifyAppNameMap,
  gotifyMessageToLocal,
  openGotifyStream,
} from '../lib/gotify'
import { NTFY_ENABLED } from '../lib/features'
import { parseTopics } from '../lib/ids'
import {
  fetchNtfyPoll,
  ntfyEventToLocal,
  openNtfySse,
} from '../lib/ntfy'
import { useInboxStore } from '../store/inbox'
import { useSettingsStore } from '../store/settings'

const GOTIFY_POLL_MS = 20_000
const NTFY_POLL_MS = 20_000

export function useSync() {
  const gotify = useSettingsStore((s) => s.gotify)
  const ntfy = useSettingsStore((s) => s.ntfy)
  const upsertMessages = useInboxStore((s) => s.upsertMessages)
  const setGotifyApps = useInboxStore((s) => s.setGotifyApps)
  const setStatus = useInboxStore((s) => s.setStatus)
  const setLoading = useInboxStore((s) => s.setLoading)
  const setError = useInboxStore((s) => s.setError)
  const clearBackend = useInboxStore((s) => s.clearBackend)

  const gotifyPollRef = useRef<number | null>(null)
  const ntfyPollRef = useRef<number | null>(null)
  const ntfySinceRef = useRef<number>(0)
  const gotifyLiveRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let ws: WebSocket | null = null
    gotifyLiveRef.current = false

    const stopGotifyPoll = () => {
      if (gotifyPollRef.current != null) {
        window.clearInterval(gotifyPollRef.current)
        gotifyPollRef.current = null
      }
    }

    const pullGotify = async () => {
      const base = gotify.baseUrl.trim()
      const token = gotify.clientToken.trim()
      if (!gotify.enabled || !base || !token) {
        clearBackend('gotify')
        setStatus({ gotify: 'idle', gotifyError: undefined })
        return
      }

      try {
        setLoading(true)
        const [apps, messages] = await Promise.all([
          fetchGotifyApplications(base, token).catch(() => []),
          fetchGotifyMessages(base, token),
        ])
        if (cancelled) return
        if (apps.length) setGotifyApps(gotifyAppNameMap(apps))
        upsertMessages(messages.map((m) => gotifyMessageToLocal(m)))
        setError(undefined)
        const mode = useInboxStore.getState().status.gotify
        if (mode === 'error') {
          setStatus({
            gotify: gotifyPollRef.current != null ? 'polling' : 'connecting',
            gotifyError:
              gotifyPollRef.current != null
                ? GOTIFY_WS_FALLBACK_HINT
                : undefined,
          })
        }
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : copy.gotifySyncFailed
        setStatus({ gotify: 'error', gotifyError: message })
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const startGotifyPoll = (reason?: string) => {
      if (gotifyPollRef.current != null) {
        setStatus({
          gotify: 'polling',
          gotifyError: reason ?? GOTIFY_WS_FALLBACK_HINT,
        })
        return
      }
      setStatus({
        gotify: 'polling',
        gotifyError: reason ?? GOTIFY_WS_FALLBACK_HINT,
      })
      void pullGotify()
      gotifyPollRef.current = window.setInterval(() => {
        void pullGotify()
      }, GOTIFY_POLL_MS)
    }

    const startGotify = async () => {
      stopGotifyPoll()
      if (ws) {
        ws.close()
        ws = null
      }

      if (!gotify.enabled || !gotify.baseUrl.trim() || !gotify.clientToken.trim()) {
        clearBackend('gotify')
        setStatus({ gotify: 'idle', gotifyError: undefined })
        return
      }

      setStatus({ gotify: 'connecting', gotifyError: undefined })
      await pullGotify()
      if (cancelled) return

      let opened = false
      let fallbackStarted = false
      const ensurePollFallback = () => {
        if (fallbackStarted || opened || cancelled) return
        fallbackStarted = true
        startGotifyPoll(GOTIFY_WS_FALLBACK_HINT)
      }

      ws = openGotifyStream(
        gotify.baseUrl.trim(),
        gotify.clientToken.trim(),
        (msg) => {
          upsertMessages([gotifyMessageToLocal(msg)])
        },
        (status) => {
          if (cancelled) return
          if (status === 'open') {
            opened = true
            gotifyLiveRef.current = true
            fallbackStarted = false
            stopGotifyPoll()
            setStatus({ gotify: 'live', gotifyError: undefined })
            return
          }

          if (status === 'error' || status === 'close') {
            if (gotifyLiveRef.current) {
              gotifyLiveRef.current = false
              fallbackStarted = false
              opened = false
              startGotifyPoll(GOTIFY_WS_FALLBACK_HINT)
              return
            }
            ensurePollFallback()
          }
        },
      )

      window.setTimeout(() => {
        ensurePollFallback()
      }, 2500)
    }

    void startGotify()

    return () => {
      cancelled = true
      stopGotifyPoll()
      if (ws) ws.close()
    }
  }, [
    gotify.enabled,
    gotify.baseUrl,
    gotify.clientToken,
    upsertMessages,
    setStatus,
    setLoading,
    setError,
    clearBackend,
    setGotifyApps,
  ])

  useEffect(() => {
    if (!NTFY_ENABLED) {
      clearBackend('ntfy')
      setStatus({ ntfy: 'idle', ntfyError: undefined })
      return
    }

    let cancelled = false
    let source: EventSource | null = null
    ntfySinceRef.current = 0

    const stopNtfyPoll = () => {
      if (ntfyPollRef.current != null) {
        window.clearInterval(ntfyPollRef.current)
        ntfyPollRef.current = null
      }
    }

    const topics = parseTopics(ntfy.topics)

    const pullNtfy = async () => {
      const server = ntfy.serverUrl.trim()
      if (!ntfy.enabled || !server || topics.length === 0) {
        clearBackend('ntfy')
        setStatus({ ntfy: 'idle', ntfyError: undefined })
        return
      }

      try {
        const events = await fetchNtfyPoll(
          server,
          topics,
          ntfySinceRef.current || 0,
        )
        if (cancelled) return
        if (events.length) {
          const maxTime = Math.max(...events.map((e) => e.time || 0))
          if (maxTime > ntfySinceRef.current) {
            ntfySinceRef.current = maxTime
          }
          upsertMessages(events.map(ntfyEventToLocal))
        }
        setError(undefined)
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : copy.ntfySyncFailed
        setStatus({ ntfy: 'error', ntfyError: message })
        setError(message)
      }
    }

    const startNtfyPoll = () => {
      stopNtfyPoll()
      setStatus({
        ntfy: 'polling',
        ntfyError: undefined,
      })
      ntfyPollRef.current = window.setInterval(() => {
        void pullNtfy()
      }, NTFY_POLL_MS)
    }

    const startNtfy = async () => {
      stopNtfyPoll()
      if (source) {
        source.close()
        source = null
      }

      if (!ntfy.enabled || !ntfy.serverUrl.trim() || topics.length === 0) {
        clearBackend('ntfy')
        setStatus({ ntfy: 'idle', ntfyError: undefined })
        return
      }

      setStatus({ ntfy: 'connecting', ntfyError: undefined })
      await pullNtfy()
      if (cancelled) return

      source = openNtfySse(
        ntfy.serverUrl.trim(),
        topics,
        (event) => {
          if (event.time && event.time > ntfySinceRef.current) {
            ntfySinceRef.current = event.time
          }
          upsertMessages([ntfyEventToLocal(event)])
        },
        (status) => {
          if (cancelled) return
          if (status === 'open') {
            stopNtfyPoll()
            setStatus({ ntfy: 'live', ntfyError: undefined })
            return
          }
          if (status === 'error') {
            if (source) {
              source.close()
              source = null
            }
            startNtfyPoll()
          }
        },
      )

      if (!source) {
        startNtfyPoll()
      }
    }

    void startNtfy()

    return () => {
      cancelled = true
      stopNtfyPoll()
      if (source) source.close()
    }
  }, [
    ntfy.enabled,
    ntfy.serverUrl,
    ntfy.topics,
    upsertMessages,
    setStatus,
    setError,
    clearBackend,
  ])
}
