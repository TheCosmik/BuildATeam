const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS team_abbr TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS team_name TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS team_color TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS seasons_played INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS career_wins INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS career_losses INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS playoff_appearances INTEGER NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS best_finish TEXT`;
    await sql`ALTER TABLE characters ADD COLUMN IF NOT EXISTS best_finish_rank INTEGER`;
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
