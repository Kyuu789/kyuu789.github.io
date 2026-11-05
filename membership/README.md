# 可可西里单词屋会员服务（开发版）

此目录是独立会员 API，不会修改现有 GitHub Pages 页面，也不会读取、迁移或覆盖现有的 `kittyCET4_v1` 学习数据。

## API
- `GET /api/health`：服务健康检查
- `POST /api/activate`：一次性兑换码激活，返回用户 token 和到期时间
- `GET /api/status`：使用 `Authorization: Bearer <token>` 查询会员状态
- `POST /api/admin/codes`：管理员生成兑换码，需 `X-Admin-Key` 请求头

## 管理员如何生成兑换码
已添加本地命令行工具：`membership/admin/generate-codes.mjs`。它不会把管理员密钥写入网页或仓库。

部署完成后，在自己的电脑安装 Node.js 18 或更新版本，并在终端设置环境变量：
- macOS / Linux：`export WORKER_URL="https://你的Worker地址"`，再执行 `export ADMIN_SECRET="你的管理员密钥"`
- Windows PowerShell：`$env:WORKER_URL="https://你的Worker地址"`，再执行 `$env:ADMIN_SECRET="你的管理员密钥"`

生成 1 个、有效期 30 天的兑换码：
`node membership/admin/generate-codes.mjs`

生成 10 个、有效期 90 天的兑换码：
`node membership/admin/generate-codes.mjs 10 90`

兑换码只在命令行显示这一次。不要截图公开、不要提交到 GitHub，也不要把管理员密钥交给同学。

## 安全设计与当前限制
- 数据库只保存兑换码 SHA-256 摘要，不保存明文兑换码。
- 激活时使用 D1 batch 将兑换码核销和会员创建放在同一事务批次中，避免只核销却未创建会员。
- 兑换码只能成功兑换一次；随机码使用拒绝采样生成。
- 用户 token 只在激活时返回一次，数据库保存其摘要。
- 管理员密钥通过 Worker Secret 配置，不写入仓库。
- 管理员接口只供本地命令行调用，不应从公开网页调用。
- API 对浏览器来源设置 CORS 限制，并对响应设置 no-store。
- 学习数据仍留在用户自己的浏览器中。

**仍需补齐的上线防护：**管理员接口和激活接口的速率限制、管理员操作审计、自动化并发/重复兑换测试，以及部署后的安全检查。CORS 不是身份认证，也不能代替速率限制。

## 部署尚未完成
此开发版尚未连接真实 Cloudflare D1，也没有部署 Worker。请勿向同学发放兑换码，直到完成 Cloudflare 资源创建、Secret 设置、数据库迁移、线上 API 测试及前端接入。

## Cloudflare 配置步骤
1. 创建 D1 数据库，名称使用 `cocoxili-members`。
2. 将 D1 数据库 ID 填入 `worker/wrangler.toml`。
3. 执行 `wrangler d1 execute cocoxili-members --file=./schema.sql`（在 `membership/worker` 目录中执行）。
4. 设置强随机管理员密钥：`wrangler secret put ADMIN_SECRET`。
5. 部署：`wrangler deploy`。
6. 访问 `/api/health` 确认服务可用。
7. 在本地设置 `WORKER_URL` 和 `ADMIN_SECRET` 后，使用上面的命令行工具生成测试兑换码。

在数据库与 Worker 部署前，管理员工具无法真正生成可用兑换码。
