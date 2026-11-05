# 可可西里单词屋会员服务（预备版）

此目录是独立会员 API，不会修改现有 GitHub Pages 页面，也不会读取、迁移或覆盖现有的 `kittyCET4_v1` 学习数据。

## API
- `GET /api/health`：服务健康检查
- `POST /api/activate`：一次性兑换码激活，返回用户 token 和到期时间
- `GET /api/status`：使用 `Authorization: Bearer <token>` 查询会员状态
- `POST /api/admin/codes`：管理员生成兑换码，需 `X-Admin-Key` 请求头

## 安全设计
- 数据库只保存兑换码 SHA-256 摘要，不保存明文兑换码。
- 兑换码只能成功兑换一次。
- 用户 token 只在激活时返回一次，数据库保存其摘要。
- 管理员密钥通过 Worker Secret 配置，不写入仓库。
- CORS 仅允许当前 GitHub Pages 域名。
- 学习数据仍留在用户自己的浏览器中。

## 部署尚未完成
此预备版尚未连接真实 Cloudflare D1，也没有部署 Worker。请勿向同学发放兑换码，直到完成 Cloudflare 资源创建、Secret 设置、数据库迁移、线上 API 测试及前端接入。

## Cloudflare 配置步骤
1. 创建 D1 数据库，名称使用 `cocoxili-members`。
2. 将 D1 数据库 ID 填入 `wrangler.toml`。
3. 执行 `wrangler d1 execute cocoxili-members --file=./schema.sql`。
4. 设置管理员密钥：`wrangler secret put ADMIN_SECRET`。
5. 部署：`wrangler deploy`。
6. 访问 `/api/health` 确认服务可用。
