import { useNavigate, useLocation } from 'react-router-dom'
import { HOME_PATH, SETTINGS_PATH, threadPath, withSearch } from '../lib/paths'

function historyIndex(): number {
  const state = window.history.state as { idx?: number } | null
  return typeof state?.idx === 'number' ? state.idx : 0
}

export function useAppNavigate() {
  const navigate = useNavigate()
  const location = useLocation()

  return {
    toHome: () => navigate(withSearch(HOME_PATH, location.search)),
    toThread: (peerKey: string) =>
      navigate(withSearch(threadPath(peerKey), location.search)),
    toSettings: (replace = false) =>
      navigate(withSearch(SETTINGS_PATH, location.search), { replace }),
    /** Prefer real history back; fall back to inbox if this was the first entry. */
    back: () => {
      if (historyIndex() > 0) navigate(-1)
      else navigate(withSearch(HOME_PATH, location.search))
    },
  }
}
