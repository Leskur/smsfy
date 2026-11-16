import { useEffect } from 'react'
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { SETTINGS_PATH, threadPath } from '../lib/paths'

/** Old `?peer=` / `?settings=1` links → path routes. */
export function LegacyQueryRedirect() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    const settings = params.get('settings')
    const peer = params.get('peer')?.trim()
    if (!settings && !peer) return

    const next = new URLSearchParams(params)
    next.delete('settings')
    next.delete('peer')
    const search = next.toString() ? `?${next.toString()}` : ''

    if (settings === '1' || settings === 'true' || settings === 'yes') {
      navigate({ pathname: SETTINGS_PATH, search }, { replace: true })
      return
    }
    if (peer) {
      navigate({ pathname: threadPath(peer), search }, { replace: true })
    }
  }, [navigate, params])

  return null
}

/** Old `/c/:peer` bookmarks → `/sms/:peer`. */
export function LegacyThreadRedirect() {
  const { peer } = useParams()
  if (!peer) return <Navigate to="/" replace />
  return <Navigate to={threadPath(decodeURIComponent(peer))} replace />
}
