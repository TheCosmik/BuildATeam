const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_stat TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS training_started_at TIMESTAMPTZ`;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
