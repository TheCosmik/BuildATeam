const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_stat TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_points INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_points_synced_at TIMESTAMPTZ`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS speed_upgrade_tier INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_progress JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_boost_percent INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS active_boost_expires_at TIMESTAMPTZ`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT`;

    // training_points is now a $ balance, not passively-accruing Training
    // Points - reset everyone to $0 since the old accrual mechanic is
    // being retired and there's no real earning method yet.
    await sql`UPDATE characters SET training_points = 0`;

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
