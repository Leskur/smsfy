# Smsfy

类 Google Messages 的**只读**网页短信收件箱：手机短信经 **Gotify** / **ntfy** 转发后，按对方号码聚合为会话（不可回复）。

## 运行

```bash
npm install
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。预览 UI 加 `?demo=1`（会按需请求 `/demo-messages.json`，不进主包）。

## 设置

1. 打开**设置**（列表右上角 ···）
2. 启用 Gotify 和/或 ntfy 信息源（Gotify：服务器 + 客户端令牌；ntfy：服务器 + 主题，受保护主题可填访问令牌）
3. 按 [转发约定](docs/forwarding.md) 在手机端转发短信

设置保存在 `localStorage`（键名仍为 `sms-web-settings`，保持兼容）。

## 网络

浏览器直连 Gotify / ntfy（需服务端 CORS；Gotify WS 需放行页面 Origin；自建 ntfy 也需允许页面 Origin）。  
连接失败时 Gotify / ntfy 会回退 20s HTTP 轮询；ntfy 优先 SSE。

## 添加到桌面（PWA）

生产构建已带 Web App Manifest 与 Service Worker。用 HTTPS（或本机 localhost）打开后：

- 手机浏览器：分享 / 菜单 →「添加到主屏幕」
- 桌面 Chrome / Edge：地址栏安装图标，或菜单「安装应用」

`npm run dev` 不启用 PWA；用 `npm run build && npm run preview` 或部署到 Pages 后再试安装。改图标后执行 `npm run icons`。

Cloudflare Pages：构建命令 `npm run build`，输出目录 `dist`。`public/_redirects` 已配置 SPA 回退。

## 脚本

| 命令              | 说明           |
|-------------------|----------------|
| `npm run dev`     | 开发服务器 :5173 |
| `npm run build`   | 生产构建       |
| `npm run preview` | 预览构建       |
| `npm run icons`   | 从 favicon 生成 PWA 图标 |
