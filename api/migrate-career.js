const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_stat TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_points INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_points_synced_at TIMESTAMPTZ`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS speed_upgrade_tier INTEGER NOT NULL DEFAULT 0`;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
