const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');

module.exports = async function handler(req, res) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }

    const rows = await sql`
      SELECT character_name, stats, stat_sources, superbowl_wins
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(200).json({ character: null });
      return;
    }

    res.status(200).json({ character: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
