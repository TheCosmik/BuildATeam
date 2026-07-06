const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const userId = await requireUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }

    const rows = await sql`
      UPDATE characters
      SET superbowl_wins = superbowl_wins + 1, updated_at = now()
      WHERE user_id = ${userId}
      RETURNING superbowl_wins
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No character found for this user' });
      return;
    }

    res.status(200).json({ superbowlWins: rows[0].superbowl_wins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
