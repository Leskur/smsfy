import { deleteGotifyMessage } from './gotify'
import { deleteNtfyMessage } from './ntfy'
import type { GotifySettings, Message, NtfySettings } from '../types'

export interface DeleteUpstreamResult {
  gotifyAttempted: number
  gotifyFailed: number
  ntfyAttempted: number
  ntfyFailed: number
}

/** Best-effort remote delete for messages already removed locally. */
export async function deleteMessagesUpstream(
  items: Message[],
  settings: { gotify: GotifySettings; ntfy: NtfySettings },
): Promise<DeleteUpstreamResult> {
  const result: DeleteUpstreamResult = {
    gotifyAttempted: 0,
    gotifyFailed: 0,
    ntfyAttempted: 0,
    ntfyFailed: 0,
  }

  const gotify = settings.gotify
  const ntfy = settings.ntfy
  const gotifyReady =
    gotify.enabled &&
    Boolean(gotify.baseUrl.trim()) &&
    Boolean(gotify.clientToken.trim())
  const ntfyReady =
    ntfy.enabled && Boolean(ntfy.serverUrl.trim())

  const tasks: Promise<void>[] = []

  for (const item of items) {
    if (item.backend === 'gotify' && gotifyReady && item.remoteId != null) {
      result.gotifyAttempted += 1
      tasks.push(
        deleteGotifyMessage(
          gotify.baseUrl.trim(),
          gotify.clientToken.trim(),
          item.remoteId,
        ).catch(() => {
          result.gotifyFailed += 1
        }),
      )
      continue
    }

    if (
      item.backend === 'ntfy' &&
      ntfyReady &&
      item.remoteId != null &&
      item.source
    ) {
      result.ntfyAttempted += 1
      tasks.push(
        deleteNtfyMessage(
          ntfy.serverUrl.trim(),
          item.source,
          String(item.remoteId),
          ntfy.accessToken,
        ).catch(() => {
          result.ntfyFailed += 1
        }),
      )
    }
  }

  await Promise.all(tasks)
  return result
}
