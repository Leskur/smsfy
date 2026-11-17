/** User-facing Chinese copy. */

export const copy = {
  inboxTitle: '信息',
  settings: '设置',
  settingsAria: '设置',
  backAria: '返回信息列表',
  settingsCloseAria: '关闭设置',
  loading: '加载中',
  otpHint: '验证码',
  openLinkAria: '链接',
  actionCopyCode: '复制验证码',
  actionCopyLink: '复制链接',
  actionOpenLink: '打开链接',
  toastCopied: '已复制',
  scrollTopAria: '回到顶部',
  unreadAria: '未读',
  deleteThreadAria: '删除此号码',
  threadMoreAria: '更多',
  deleteThreadDone: '已删除',
  deleteThreadPartial: '本机已删除，部分云端消息未能移除',
  dialogCancel: '取消',
  dialogDelete: '删除',
  listMenuCopy: '复制',
  listMenuDelete: '删除',
  listMenuSelect: '多选',
  listSelectCancel: '取消',
  listSelectDelete: '删除',
  listSelectCount: '已选',

  emptyListTitle: '暂无信息',
  emptyListHint: '请先在设置中连接信息源。信息会按对方手机号分组显示。',
  emptyListConfiguredHint: '已连接信息源，暂时还没有短信。',
  emptyListCta: '打开设置',

  emptyThreadTitle: '选择一条信息',
  emptyThreadHint: '短信按对方手机号归类（仅接收，不可回复）。',
  emptyThreadMessages: '暂无消息',

  settingsTitle: '设置',

  themeLegend: '外观',
  themeSystem: '跟随系统',
  themeLight: '浅色',
  themeDark: '深色',
  themeAria: '外观模式',

  gotifyLegend: 'Gotify',
  gotifyEnable: '启用 Gotify',
  gotifyServer: '服务器地址',
  gotifyToken: '客户端令牌',
  gotifyTokenShow: '显示令牌',
  gotifyTokenHide: '隐藏令牌',

  ntfyLegend: 'ntfy',
  ntfyEnable: '启用 ntfy',
  ntfyServer: '服务器',
  ntfyTopic: '主题',
  ntfyToken: '访问令牌',
  ntfyTokenShow: '显示令牌',
  ntfyTokenHide: '隐藏令牌',

  statusLabel: '状态',
  statusIdle: '空闲',
  statusConnecting: '连接中',
  statusLive: '实时',
  statusPolling: '轮询',
  statusError: '错误',

  gotifySyncErrorTitle: 'Gotify 无法同步',
  ntfySyncErrorTitle: 'ntfy 无法同步',
  syncErrorOpenSettings: '去设置',

  demoBanner: '当前为演示数据',

  unknownPeer: '未知号码',
  yesterday: '昨天',
  gotifySyncFailed: '同步失败，请稍后重试',
  gotifyUnauthorized: '令牌无效或权限不足',
  gotifyNotFound: '找不到接口，请检查服务器地址',
  ntfySyncFailed: '同步失败，请稍后重试',
  ntfyUnauthorized: '令牌无效或权限不足',
  ntfyNotFound: '找不到主题或服务器，请检查配置',
  gotifyWsFallback:
    '实时连接不可用，已改为定时刷新。请检查 Gotify 的 AllowedWebSocketOrigins。',
} as const

/** Map upstream HTTP status to a short user-facing sync error. */
export function syncHttpError(
  service: 'gotify' | 'ntfy',
  status: number,
): string {
  if (status === 401 || status === 403) {
    return service === 'gotify' ? copy.gotifyUnauthorized : copy.ntfyUnauthorized
  }
  if (status === 404) {
    return service === 'gotify' ? copy.gotifyNotFound : copy.ntfyNotFound
  }
  return service === 'gotify' ? copy.gotifySyncFailed : copy.ntfySyncFailed
}

export function deleteThreadsTitle(count: number): string {
  return `要删除${count}组对话吗？`
}

export function deleteMessagesTitle(count: number): string {
  return `要删除${count}条信息吗？`
}

export function statusLabel(
  state: 'idle' | 'connecting' | 'live' | 'polling' | 'error',
): string {
  switch (state) {
    case 'idle':
      return copy.statusIdle
    case 'connecting':
      return copy.statusConnecting
    case 'live':
      return copy.statusLive
    case 'polling':
      return copy.statusPolling
    case 'error':
      return copy.statusError
  }
}
