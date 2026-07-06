const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS characters (
        user_id        TEXT PRIMARY KEY,
        username       TEXT,
        character_name TEXT,
        stats          JSONB,
        stat_sources   JSONB,
        superbowl_wins INTEGER NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS characters_username_idx ON characters (username)
    `;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
