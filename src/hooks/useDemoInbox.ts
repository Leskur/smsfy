import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchDemoMessages, readDemoQuery } from '../lib/demo'
import { useInboxStore } from '../store/inbox'

/** Demo inbox only when URL has `?demo=1` (or true/yes/on). */
export function useDemoInbox() {
  const [params] = useSearchParams()
  const upsertMessages = useInboxStore((s) => s.upsertMessages)
  const clearBackend = useInboxStore((s) => s.clearBackend)
  const loadedRef = useRef(false)

  const active = readDemoQuery(`?${params.toString()}`) === true

  useEffect(() => {
    if (!active) {
      if (loadedRef.current) {
        clearBackend('demo')
        loadedRef.current = false
      }
      return
    }

    if (loadedRef.current) return

    let cancelled = false
    void fetchDemoMessages()
      .then((messages) => {
        if (cancelled) return
        upsertMessages(messages)
        loadedRef.current = true
      })
      .catch(() => {
        /* demo is optional UI preview — ignore load failures */
      })

    return () => {
      cancelled = true
    }
  }, [active, upsertMessages, clearBackend])

  return { demoActive: active }
}
