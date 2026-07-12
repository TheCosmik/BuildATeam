const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress } = require('../lib/training');

// Called when the player leaves the career page (tab hidden/closed). Banks
// whatever XP was earned into training_progress and freezes the clock -
// career-get.js resumes it automatically the next time the page is viewed.
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
      SELECT stats, training_stat, training_started_at, training_progress, training_points,
             training_points_synced_at, speed_upgrade_tier
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(200).json({ ok: true });
      return;
    }

    await flushProgress(userId, rows[0], { pause: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
