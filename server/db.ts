import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function upsertUser(user: Record<string, unknown>, ipAddress?: string, userAgent?: string) {
  const {
    id, userId, name, username, email, language, gender, birthdate,
    isAdmin, isVip, vipPlan, vipExpiry, onboardingComplete, platform,
  } = user as any;

  await query(
    `INSERT INTO soulie_users (
      id, user_id, name, username, email, language, gender, birthdate,
      is_admin, is_vip, vip_plan, vip_expiry, onboarding_complete,
      platform, ip_address, user_agent, last_seen, synced_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),$17)
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      name = EXCLUDED.name,
      username = EXCLUDED.username,
      email = COALESCE(EXCLUDED.email, soulie_users.email),
      language = EXCLUDED.language,
      gender = COALESCE(EXCLUDED.gender, soulie_users.gender),
      birthdate = COALESCE(EXCLUDED.birthdate, soulie_users.birthdate),
      is_admin = EXCLUDED.is_admin,
      is_vip = EXCLUDED.is_vip,
      vip_plan = EXCLUDED.vip_plan,
      vip_expiry = EXCLUDED.vip_expiry,
      onboarding_complete = EXCLUDED.onboarding_complete,
      platform = COALESCE(EXCLUDED.platform, soulie_users.platform),
      ip_address = COALESCE(EXCLUDED.ip_address, soulie_users.ip_address),
      user_agent = COALESCE(EXCLUDED.user_agent, soulie_users.user_agent),
      last_seen = NOW(),
      synced_at = EXCLUDED.synced_at`,
    [
      id, userId ?? null, name ?? null, username ?? null, email ?? null,
      language ?? "en", gender ?? null, birthdate ?? null,
      isAdmin ?? false, isVip ?? false, vipPlan ?? null, vipExpiry ?? null,
      onboardingComplete ?? false, platform ?? null,
      ipAddress ?? null, userAgent ?? null, Date.now(),
    ]
  );
}

export async function logEvent(
  userId: string,
  eventType: string,
  screen: string | null,
  action: string | null,
  metadata: Record<string, unknown>,
  ipAddress?: string,
  platform?: string,
  userAgent?: string,
) {
  await query(
    `INSERT INTO soulie_events (user_id, event_type, screen, action, metadata, ip_address, platform, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, eventType, screen, action, JSON.stringify(metadata), ipAddress ?? null, platform ?? null, userAgent ?? null]
  );
}

export async function getAllUsers() {
  const res = await query(
    `SELECT
      id, user_id, name, username, email, language, gender, birthdate,
      is_admin, is_vip, vip_plan, vip_expiry, platform, ip_address,
      user_agent, country, city, onboarding_complete,
      created_at, last_seen, synced_at
     FROM soulie_users
     ORDER BY last_seen DESC NULLS LAST`
  );
  return res.rows;
}

export async function getUserEvents(userId: string, limit = 50) {
  const res = await query(
    `SELECT id, event_type, screen, action, metadata, ip_address, platform, user_agent, created_at
     FROM soulie_events
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getEventStats() {
  const res = await query(
    `SELECT
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
     FROM soulie_events
     GROUP BY event_type
     ORDER BY count DESC`
  );
  return res.rows;
}

export async function findUserByEmail(email: string) {
  const res = await query(
    `SELECT * FROM soulie_users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return res.rows[0] ?? null;
}

export async function setUserPasswordHash(userId: string, hash: string) {
  await query(
    `UPDATE soulie_users SET password_hash = $1 WHERE id = $2`,
    [hash, userId]
  );
}

export async function getPasswordHash(id: string) {
  const res = await query(`SELECT password_hash FROM soulie_users WHERE id = $1`, [id]);
  return res.rows[0]?.password_hash ?? null;
}

export default pool;
