# 转发约定

Gotify / ntfy 统一字段约定，手机端按此转发后，Smsfy 才能按对方号码聚合成会话。

| 字段 | 含义 |
|------|------|
| `title` | 对方手机号（会话按此分组） |
| `message` | 短信正文 |
| Gotify 应用名 / ntfy 主题 | 显示在时间后作为来源，不作会话名 |

## 会话键

- `peer:<normalized-phone>` — 例如 title `+1 (555) 010-1234` → `peer:+15550101234`
- 空 title → `peer:unknown`
