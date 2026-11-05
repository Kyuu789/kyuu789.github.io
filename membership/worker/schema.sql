CREATE TABLE IF NOT EXISTS activation_codes (
  code_hash TEXT PRIMARY KEY,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  created_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  user_id TEXT
);

CREATE TABLE IF NOT EXISTS members (
  user_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activation_codes_redeemed
ON activation_codes(redeemed_at);

CREATE INDEX IF NOT EXISTS idx_members_expires
ON members(expires_at);
