import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildDemoMessages, readDemoQuery } from '../lib/demo'
import { useInboxStore } from '../store/inbox'

/** Demo inbox only when URL has `?demo=1` (or true/yes/on). */
export function useDemoInbox() {
  const [params] = useSearchParams()
  const upsertMessages = useInboxStore((s) => s.upsertMessages)
  const clearBackend = useInboxStore((s) => s.clearBackend)
  const loadedRef = useRef(false)

  const active = readDemoQuery(`?${params.toString()}`) === true

  useEffect(() => {
    if (active) {
      if (!loadedRef.current) {
        upsertMessages(buildDemoMessages())
        loadedRef.current = true
      }
      return
    }
    if (loadedRef.current) {
      clearBackend('demo')
      loadedRef.current = false
    }
  }, [active, upsertMessages, clearBackend])

  return { demoActive: active }
}
