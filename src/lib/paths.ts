/** App routes. Keep search (e.g. ?demo=1) when navigating. */

export const HOME_PATH = '/'
export const SETTINGS_PATH = '/settings'

export function threadPath(peerKey: string): string {
  return `/sms/${encodeURIComponent(peerKey)}`
}

export function withSearch(
  pathname: string,
  search: string,
): { pathname: string; search: string } {
  return { pathname, search }
}
