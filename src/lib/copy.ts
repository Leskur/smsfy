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
  deleteThreadConfirm: '删除后本机不再显示该号码的短信，并会尽量从信息源移除。确定删除？',
  deleteThreadConfirmMany: '删除后本机不再显示所选号码的短信，并会尽量从信息源移除。确定删除？',
  deleteThreadDone: '已删除',
  deleteThreadPartial: '本机已删除，部分云端消息未能移除',
  deleteMessagesConfirm: '删除后本机不再显示所选短信，并会尽量从信息源移除。确定删除？',
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

  pipeLegend: '转发约定',
  pipeHint:
    'Gotify / ntfy 统一：title = 对方手机号，message = 短信正文。Gotify 应用名与 ntfy 主题显示在时间后作为来源，不作会话名。',

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
