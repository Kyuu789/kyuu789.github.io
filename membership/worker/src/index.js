const corsHeaders = {
  "Access-Control-Allow-Origin": "https://kyuu789.github.io",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Key",
  "Vary": "Origin"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const raw = [...bytes].map(b => alphabet[b % alphabet.length]).join("");
  return raw.match(/.{1,4}/g).join("-");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function handle(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "cocoxili-membership" });
  }

  if (url.pathname === "/api/activate" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/.test(code)) {
      return json({ ok: false, error: "兑换码格式不正确" }, 400);
    }

    const codeHash = await sha256(code);
    const row = await env.DB.prepare(
      "SELECT code_hash, duration_days FROM activation_codes WHERE code_hash = ? AND redeemed_at IS NULL"
    ).bind(codeHash).first();

    if (!row) return json({ ok: false, error: "兑换码无效或已使用" }, 400);

    const userId = crypto.randomUUID();
    const token = randomToken();
    const tokenHash = await sha256(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + Number(row.duration_days) * 86400;

    const claimed = await env.DB.prepare(
      "UPDATE activation_codes SET redeemed_at = ?, user_id = ? WHERE code_hash = ? AND redeemed_at IS NULL"
    ).bind(now, userId, codeHash).run();

    if (!claimed.meta || claimed.meta.changes !== 1) {
      return json({ ok: false, error: "兑换码已被使用，请检查后重试" }, 409);
    }

    await env.DB.prepare(
      "INSERT INTO members (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(userId, tokenHash, now, expiresAt).run();

    return json({
      ok: true,
      token,
      expiresAt,
      message: "激活成功"
    });
  }

  if (url.pathname === "/api/status" && request.method === "GET") {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ ok: false, active: false }, 401);

    const tokenHash = await sha256(token);
    const member = await env.DB.prepare(
      "SELECT expires_at FROM members WHERE token_hash = ?"
    ).bind(tokenHash).first();

    const active = !!member && Number(member.expires_at) > Math.floor(Date.now() / 1000);
    return json({ ok: true, active, expiresAt: member?.expires_at || null });
  }

  if (url.pathname === "/api/admin/codes" && request.method === "POST") {
    if (!env.ADMIN_SECRET || request.headers.get("X-Admin-Key") !== env.ADMIN_SECRET) {
      return json({ ok: false, error: "未授权" }, 401);
    }
    const body = await request.json().catch(() => ({}));
    const count = Math.max(1, Math.min(100, Number(body.count) || 1));
    const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = randomCode();
      await env.DB.prepare(
        "INSERT INTO activation_codes (code_hash, duration_days, created_at) VALUES (?, ?, ?)"
      ).bind(await sha256(code), days, Math.floor(Date.now() / 1000)).run();
      codes.push(code);
    }
    return json({ ok: true, durationDays: days, codes });
  }

  return json({ ok: false, error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== "https://kyuu789.github.io") {
      return new Response("Origin not allowed", { status: 403 });
    }
    try {
      return await handle(request, env);
    } catch (error) {
      console.error("Membership API error:", error);
      return json({ ok: false, error: "服务暂时不可用，请稍后重试" }, 500);
    }
  }
};
