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
  ntfyComingSoon: '开发中',

  statusLabel: '状态',
  statusIdle: '空闲',
  statusConnecting: '连接中',
  statusLive: '实时',
  statusPolling: '轮询',
  statusError: '错误',

  demoBanner: '当前为演示数据',

  unknownPeer: '未知号码',
  yesterday: '昨天',
  gotifySyncFailed: 'Gotify 同步失败',
  ntfySyncFailed: 'ntfy 同步失败',
  gotifyWsFallback:
    '实时连接不可用，已改为定时刷新。请检查 Gotify 的 AllowedWebSocketOrigins。',
} as const

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
