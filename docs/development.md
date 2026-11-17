# 开发指南

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。

- 预览 UI：加 `?demo=1`（请求 `/demo-messages.json`，演示数据不写入本地库）
- 打开设置：列表右上角 `···`，或桌面快捷键 `Ctrl+,` / `⌘+,`

## 连接信息源

1. 在设置中启用 Gotify 和/或 ntfy  
   - Gotify：服务器地址 + 客户端令牌  
   - ntfy：服务器 + 主题；受保护主题可填访问令牌  
2. 手机端按 [转发约定](forwarding.md) 转发短信（`title` = 对方号码，`message` = 正文）

设置保存在 `localStorage`（键名 `sms-web-settings`）。

浏览器直连 Gotify / ntfy，需服务端允许 CORS；Gotify WebSocket 需放行页面 Origin。连接失败时会回退约 20s 的 HTTP 轮询；ntfy 优先 SSE。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 :5173 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run icons` | 从 favicon 生成 PWA 图标（仅图标变更时需要） |

## PWA

生产环境（HTTPS 或 localhost）打开后：

- 手机：浏览器菜单 →「添加到主屏幕」
- 桌面 Chrome / Edge：地址栏安装图标，或菜单「安装应用」

图标变更后执行 `npm run icons`。正式安装体验请用 `npm run build && npm run preview` 或部署后再试。

## Cloudflare Pages

- 构建命令：`npm run build`
- 输出目录：`dist`
- `public/_redirects` 已配置 SPA 回退
