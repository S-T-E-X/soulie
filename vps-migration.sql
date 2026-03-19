-- ============================================
-- SOULIE VPS DATABASE MIGRATION
-- VPS'de çalıştır: psql "postgresql://soulie:sifren@localhost:5432/soulie_db" -f vps-migration.sql
-- ============================================

-- 1. soulie_users tablosu
CREATE TABLE IF NOT EXISTS soulie_users (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT,
  name                 TEXT,
  username             TEXT,
  email                TEXT,
  password_hash        TEXT,
  language             TEXT DEFAULT 'en',
  gender               TEXT,
  birthdate            TEXT,
  is_admin             BOOLEAN DEFAULT FALSE,
  is_vip               BOOLEAN DEFAULT FALSE,
  vip_plan             TEXT,
  vip_expiry           BIGINT,
  platform             TEXT,
  ip_address           TEXT,
  user_agent           TEXT,
  country              TEXT,
  city                 TEXT,
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  last_seen            TIMESTAMPTZ DEFAULT NOW(),
  synced_at            BIGINT DEFAULT 0,
  apple_user_id        TEXT,
  deleted_at           TIMESTAMPTZ,
  consent_revoked_at   TIMESTAMPTZ,
  email_relay_disabled BOOLEAN DEFAULT FALSE
);

-- 2. soulie_users indeksleri
CREATE INDEX IF NOT EXISTS idx_soulie_users_email ON soulie_users (email);
CREATE INDEX IF NOT EXISTS idx_soulie_users_apple ON soulie_users (apple_user_id) WHERE apple_user_id IS NOT NULL;

-- 3. soulie_events tablosu
CREATE TABLE IF NOT EXISTS soulie_events (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  screen     TEXT,
  action     TEXT,
  metadata   JSONB DEFAULT '{}',
  ip_address TEXT,
  platform   TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. soulie_events indeksleri
CREATE INDEX IF NOT EXISTS idx_soulie_events_user_id ON soulie_events (user_id);
CREATE INDEX IF NOT EXISTS idx_soulie_events_created_at ON soulie_events (created_at DESC);

-- 5. soulie_apple_notifications tablosu
CREATE TABLE IF NOT EXISTS soulie_apple_notifications (
  id                SERIAL PRIMARY KEY,
  jti               TEXT UNIQUE,
  notification_type TEXT NOT NULL,
  apple_user_id     TEXT,
  email             TEXT,
  event_datetime    TIMESTAMPTZ,
  raw_jwt           TEXT,
  events_payload    JSONB DEFAULT '{}',
  user_db_id        TEXT,
  action_taken      TEXT DEFAULT 'logged',
  processed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. soulie_apple_notifications indeksleri
CREATE INDEX IF NOT EXISTS idx_apple_notifs_apple_user ON soulie_apple_notifications (apple_user_id);
CREATE INDEX IF NOT EXISTS idx_apple_notifs_processed ON soulie_apple_notifications (processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_apple_notifs_type ON soulie_apple_notifications (notification_type);

-- 7. Admin kullanıcısı ekle (yusufstex@gmail.com : Soulieapptest2026)
INSERT INTO soulie_users (
  id, user_id, name, username, email, password_hash,
  language, is_admin, is_vip, onboarding_complete
) VALUES (
  'admin_yusuf_001',
  '999999',
  'Yusuf',
  'yusuf',
  'yusufstex@gmail.com',
  '$2b$10$0bZmikGTVk5OGpVCa5ef7en4hCsvz/W3H2.Gt6Ix2Kx3vZWXq3j9i',
  'tr',
  TRUE,
  TRUE,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_admin = TRUE,
  is_vip = TRUE,
  onboarding_complete = TRUE;

-- 8. Kontrol et
SELECT 'soulie_users' AS tablo, COUNT(*) FROM soulie_users
UNION ALL
SELECT 'soulie_events', COUNT(*) FROM soulie_events
UNION ALL
SELECT 'soulie_apple_notifications', COUNT(*) FROM soulie_apple_notifications;

SELECT id, name, email, is_admin FROM soulie_users;
