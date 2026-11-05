const ALLOWED_ORIGIN = "https://kyuu789.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Key",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders
    }
  });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  // Rejection sampling avoids modulo bias.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let raw = "";
  while (raw.length < 16) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    for (const byte of bytes) {
      if (byte < limit) raw += alphabet[byte % alphabet.length];
      if (raw.length === 16) break;
    }
  }
  return raw.match(/.{4}/g).join("-");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return null;
  const text = await request.text();
  if (text.length > 8192) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function handle(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "cocoxili-membership" });
  }

  if (url.pathname === "/api/activate" && request.method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ ok: false, error: "请求格式不正确" }, 400);
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/.test(code)) {
      return json({ ok: false, error: "兑换码格式不正确" }, 400);
    }

    const codeHash = await sha256(code);
    const row = await env.DB.prepare(
      "SELECT duration_days FROM activation_codes WHERE code_hash = ? AND redeemed_at IS NULL"
    ).bind(codeHash).first();
    if (!row) return json({ ok: false, error: "兑换码无效或已使用" }, 400);

    const userId = crypto.randomUUID();
    const token = randomToken();
    const tokenHash = await sha256(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + Number(row.duration_days) * 86400;

    // D1 batch is transactional: claiming the code and creating its member record
    // commit together, or roll back together. A competing request cannot reuse it.
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE activation_codes SET redeemed_at = ?, user_id = ? WHERE code_hash = ? AND redeemed_at IS NULL"
      ).bind(now, userId, codeHash),
      env.DB.prepare(
        "INSERT INTO members (user_id, token_hash, created_at, expires_at) " +
        "SELECT ?, ?, ?, ? WHERE EXISTS (" +
        "SELECT 1 FROM activation_codes WHERE code_hash = ? AND user_id = ? AND redeemed_at = ?)"
      ).bind(userId, tokenHash, now, expiresAt, codeHash, userId, now)
    ]);

    if (!results[0]?.meta || results[0].meta.changes !== 1 || !results[1]?.meta || results[1].meta.changes !== 1) {
      return json({ ok: false, error: "兑换码无效或已使用" }, 409);
    }

    return json({ ok: true, token, expiresAt, message: "激活成功" });
  }

  if (url.pathname === "/api/status" && request.method === "GET") {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || token.length > 256) return json({ ok: false, active: false }, 401);
    const tokenHash = await sha256(token);
    const member = await env.DB.prepare(
      "SELECT expires_at FROM members WHERE token_hash = ?"
    ).bind(tokenHash).first();
    const active = !!member && Number(member.expires_at) > Math.floor(Date.now() / 1000);
    return json({ ok: true, active, expiresAt: member?.expires_at || null });
  }

  if (url.pathname === "/api/admin/codes" && request.method === "POST") {
    const supplied = request.headers.get("X-Admin-Key") || "";
    if (!env.ADMIN_SECRET || !safeEqual(supplied, env.ADMIN_SECRET)) {
      return json({ ok: false, error: "未授权" }, 401);
    }
    const body = await readJson(request);
    if (!body) return json({ ok: false, error: "请求格式不正确" }, 400);
    const count = Number(body.count ?? 1);
    const days = Number(body.days ?? 30);
    if (!Number.isInteger(count) || count < 1 || count > 100 ||
        !Number.isInteger(days) || days < 1 || days > 3650) {
      return json({ ok: false, error: "数量须为 1-100，天数须为 1-3650" }, 400);
    }

    const codes = Array.from({ length: count }, randomCode);
    const now = Math.floor(Date.now() / 1000);
    const statements = codes.map(code => env.DB.prepare(
      "INSERT INTO activation_codes (code_hash, duration_days, created_at) VALUES (?, ?, ?)"
    ).bind(await sha256(code), days, now));
    await env.DB.batch(statements);
    // Plaintext codes are returned once. Do not log or store this response.
    return json({ ok: true, durationDays: days, codes });
  }

  return json({ ok: false, error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== ALLOWED_ORIGIN) return new Response("Origin not allowed", { status: 403 });
    try {
      return await handle(request, env);
    } catch (error) {
      console.error("Membership API error:", error?.name || "UnknownError");
      return json({ ok: false, error: "服务暂时不可用，请稍后重试" }, 500);
    }
  }
};
