const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushTraining, TRAIN_MINUTES_PER_POINT } = require('../lib/training');

module.exports = async function handler(req, res) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }

    const rows = await sql`
      SELECT character_name, stats, stat_sources, image_url, team_abbr, team_name, team_color,
             seasons_played, career_wins, career_losses, playoff_appearances, superbowl_wins, best_finish,
             training_stat, training_started_at
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(200).json({ character: null });
      return;
    }

    const character = await flushTraining(userId, rows[0]);
    res.status(200).json({ character, trainMinutesPerPoint: TRAIN_MINUTES_PER_POINT });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
