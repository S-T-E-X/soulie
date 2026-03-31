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

export async function findUserByAppleId(appleUserId: string) {
  const res = await query(
    `SELECT * FROM soulie_users WHERE apple_user_id = $1 AND deleted_at IS NULL`,
    [appleUserId]
  );
  return res.rows[0] ?? null;
}

export async function saveAppleNotification(params: {
  jti: string | null;
  notificationType: string;
  appleUserId: string | null;
  email: string | null;
  eventDatetime: Date | null;
  rawJwt: string;
  eventsPayload: Record<string, unknown>;
  userDbId: string | null;
  actionTaken: string;
}) {
  const res = await query(
    `INSERT INTO soulie_apple_notifications
       (jti, notification_type, apple_user_id, email, event_datetime, raw_jwt, events_payload, user_db_id, action_taken)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (jti) DO UPDATE SET action_taken = EXCLUDED.action_taken
     RETURNING id`,
    [
      params.jti,
      params.notificationType,
      params.appleUserId,
      params.email,
      params.eventDatetime,
      params.rawJwt,
      JSON.stringify(params.eventsPayload),
      params.userDbId,
      params.actionTaken,
    ]
  );
  return res.rows[0]?.id ?? null;
}

export async function softDeleteUser(userId: string, reason: string) {
  await query(
    `UPDATE soulie_users SET deleted_at = NOW() WHERE id = $1`,
    [userId]
  );
  await query(
    `INSERT INTO soulie_events (user_id, event_type, action, metadata)
     VALUES ($1, 'account_deleted', $2, $3)`,
    [userId, reason, JSON.stringify({ reason, source: "apple_notification" })]
  );
}

export async function softDeleteUserByAppleId(appleUserId: string, reason: string) {
  const user = await findUserByAppleId(appleUserId);
  if (user) await softDeleteUser(user.id, reason);
  return user;
}

export async function revokeAppleConsent(appleUserId: string) {
  const res = await query(
    `UPDATE soulie_users SET consent_revoked_at = NOW()
     WHERE apple_user_id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [appleUserId]
  );
  return res.rows[0] ?? null;
}

export async function updateEmailRelayStatus(appleUserId: string, disabled: boolean) {
  const res = await query(
    `UPDATE soulie_users SET email_relay_disabled = $1
     WHERE apple_user_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [disabled, appleUserId]
  );
  return res.rows[0] ?? null;
}

export async function getAppleNotifications(limit = 100) {
  const res = await query(
    `SELECT id, jti, notification_type, apple_user_id, email, event_datetime,
            events_payload, user_db_id, action_taken, processed_at
     FROM soulie_apple_notifications
     ORDER BY processed_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function upsertChat(
  userId: string,
  characterId: string,
  conversationId: string,
  messages: unknown[],
  updatedAt: number
) {
  await query(
    `INSERT INTO soulie_chats (id, user_id, character_id, messages, updated_at, created_at)
     VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), NOW())
     ON CONFLICT (id) DO UPDATE SET
       messages = EXCLUDED.messages,
       updated_at = EXCLUDED.updated_at`,
    [conversationId, userId, characterId, JSON.stringify(messages), updatedAt]
  );
}

export async function getChatsForUser(userId: string) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const res = await query(
    `SELECT id, character_id, messages, updated_at, created_at
     FROM soulie_chats
     WHERE user_id = $1 AND updated_at >= $2
     ORDER BY updated_at DESC`,
    [userId, twoWeeksAgo]
  );
  return res.rows;
}

export async function deleteChat(conversationId: string, userId: string) {
  await query(
    `DELETE FROM soulie_chats WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

export async function upsertUserXp(userId: string, totalXp: number, level: number) {
  await query(
    `UPDATE soulie_users SET total_xp = GREATEST(COALESCE(total_xp, 0), $1), level = GREATEST(COALESCE(level, 1), $2) WHERE id = $3`,
    [totalXp, level, userId]
  );
}

export async function getUserXp(userId: string): Promise<{ total_xp: number; level: number } | null> {
  const res = await query(
    `SELECT total_xp, level FROM soulie_users WHERE id = $1`,
    [userId]
  );
  if (res.rows.length === 0) return null;
  return { total_xp: res.rows[0].total_xp ?? 0, level: res.rows[0].level ?? 1 };
}

export async function getAnalyticsData() {
  const daily = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM soulie_users
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  const weekly = await query(`
    SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count
    FROM soulie_users
    WHERE created_at >= NOW() - INTERVAL '12 weeks'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week ASC
  `);

  const monthly = await query(`
    SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
    FROM soulie_users
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month ASC
  `);

  const total = await query(`SELECT COUNT(*) as count FROM soulie_users`);
  const vip = await query(`SELECT COUNT(*) as count FROM soulie_users WHERE is_vip = true`);
  const today = await query(`SELECT COUNT(*) as count FROM soulie_users WHERE DATE(created_at) = CURRENT_DATE`);
  const thisWeek = await query(`SELECT COUNT(*) as count FROM soulie_users WHERE created_at >= DATE_TRUNC('week', NOW())`);
  const thisMonth = await query(`SELECT COUNT(*) as count FROM soulie_users WHERE created_at >= DATE_TRUNC('month', NOW())`);

  return {
    daily: daily.rows,
    weekly: weekly.rows,
    monthly: monthly.rows,
    totals: {
      total: parseInt(total.rows[0]?.count ?? 0),
      vip: parseInt(vip.rows[0]?.count ?? 0),
      today: parseInt(today.rows[0]?.count ?? 0),
      thisWeek: parseInt(thisWeek.rows[0]?.count ?? 0),
      thisMonth: parseInt(thisMonth.rows[0]?.count ?? 0),
    }
  };
}

export async function expireVipUsers(): Promise<number> {
  const now = Date.now();
  const res = await query(
    `UPDATE soulie_users
     SET is_vip = false, vip_plan = NULL, vip_expiry = NULL
     WHERE is_vip = true
       AND vip_expiry IS NOT NULL
       AND vip_expiry < $1
     RETURNING id`,
    [now]
  );
  return res.rowCount ?? 0;
}

export default pool;
