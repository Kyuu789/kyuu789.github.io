# 可可西里单词屋会员服务（开发版）

此目录是独立会员 API，不会修改现有 GitHub Pages 学习页面，也不会读取、迁移或覆盖现有的 `kittyCET4_v1` 学习数据。

## 管理员手机后台
- 管理页面：`/membership/admin/`（部署到 GitHub Pages 后可用）
- 登录时填写 Worker 的 HTTPS 地址和管理员密码。
- 登录后可选择生成数量（1-100）和有效天数（1-3650）。
- 兑换码明文只在生成时显示一次，可复制后发给已付款的同学。
- 登录会话 30 分钟过期，令牌仅保存在当前标签页的 sessionStorage，关闭标签页会清除。
- 管理员密码不写入页面、不保存在浏览器存储中。请勿把密码交给同学。

## API
- `GET /api/health`：服务健康检查
- `POST /api/admin/login`：管理员密码验证，返回 30 分钟有效的签名会话
- `POST /api/admin/codes`：使用管理员会话生成兑换码
- `POST /api/activate`：一次性兑换码激活
- `GET /api/status`：使用 `Authorization: Bearer <token>` 查询会员状态

## 安全设计与当前限制
- 数据库只保存兑换码 SHA-256 摘要，不保存明文兑换码。
- 激活时使用 D1 batch 将兑换码核销和会员创建放在同一事务批次中。
- 兑换码使用拒绝采样生成，只能成功兑换一次。
- 用户 token 只在激活时返回一次，数据库保存其摘要。
- 管理员登录后使用 HMAC-SHA256 签名的短期会话令牌，令牌有效期 30 分钟。
- 管理员登录失败按客户端 IP 的单向摘要计数，15 分钟窗口内最多允许 5 次失败。
- 管理页面不包含管理员密钥；CORS 仅允许正式 GitHub Pages 域名。
- CORS 不是身份认证。上线前仍需进行真实环境测试，并建议在 Cloudflare 层再配置 WAF/Rate Limiting。
- 管理员兑换码生成记录目前没有独立审计后台；不要把兑换码明文写入公开日志。

## 部署尚未完成
此开发版尚未连接真实 Cloudflare D1，也没有部署 Worker。请勿向同学发放兑换码，直到完成 Cloudflare 资源创建、Secret 设置、数据库迁移、线上 API 测试及前端接入。

## Cloudflare 配置步骤
1. 创建 D1 数据库，名称使用 `cocoxili-members`。
2. 将 D1 数据库 ID 填入 `worker/wrangler.toml`。
3. 在 `membership/worker` 目录执行数据库迁移：`wrangler d1 execute cocoxili-members --file=./schema.sql`。
4. 设置管理员登录密码：`wrangler secret put ADMIN_SECRET`。请使用足够长且独立的随机密码。
5. 设置会话签名密钥：`wrangler secret put ADMIN_SESSION_SECRET`。使用至少 32 字节的随机值，且不要与管理员密码相同。
6. 部署：`wrangler deploy`。
7. 访问 Worker 的 `/api/health` 确认服务可用。
8. 部署 GitHub Pages 分支后打开 `/membership/admin/`，填写 Worker HTTPS 地址和管理员密码测试登录、生成、复制流程。

## 本地命令行备用工具
`membership/admin/generate-codes.mjs` 也支持电脑终端操作，使用相同的管理员登录流程。要求 Node.js 18+，环境变量为 `WORKER_URL` 和 `ADMIN_SECRET`。
