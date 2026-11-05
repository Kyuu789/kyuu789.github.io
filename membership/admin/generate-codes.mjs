#!/usr/bin/env node
// Run locally with Node.js 18+.
// Required environment variables: WORKER_URL and ADMIN_SECRET.
// Usage: node membership/admin/generate-codes.mjs [count] [days]
// Keep the terminal output private: these codes are shown only once.

const baseUrl = (process.env.WORKER_URL || "").replace(/\/+$/, "");
const adminSecret = process.env.ADMIN_SECRET || "";
const count = Number(process.argv[2] ?? 1);
const days = Number(process.argv[3] ?? 30);

if (!baseUrl || !adminSecret) {
  console.error("请先设置 WORKER_URL 和 ADMIN_SECRET 环境变量。");
  process.exit(1);
}
if (!Number.isInteger(count) || count < 1 || count > 100 ||
    !Number.isInteger(days) || days < 1 || days > 3650) {
  console.error("参数范围：数量 1-100；有效天数 1-3650。");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/admin/codes`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": adminSecret
  },
  body: JSON.stringify({ count, days })
});

const payload = await response.json().catch(() => ({}));
if (!response.ok || !payload.ok) {
  console.error(`生成失败（HTTP ${response.status}）：${payload.error || "未知错误"}`);
  process.exit(1);
}

console.log(`已生成 ${payload.codes.length} 个兑换码，有效期 ${payload.durationDays} 天：\n`);
for (const code of payload.codes) console.log(code);
console.log("\n请立即妥善保存。兑换码明文不会再次显示，切勿把管理员密钥发给同学。");
