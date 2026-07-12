const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress, xpCostForPoint, UPGRADE_TIERS, STAT_MAX } = require('../lib/training');

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
             training_stat, training_started_at, training_points, training_points_synced_at, speed_upgrade_tier
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(200).json({ character: null });
      return;
    }

    const character = await flushProgress(userId, rows[0]);
    const currentStat = character.training_stat ? character.stats[character.training_stat] : null;
    const xpNeededForCurrentPoint = currentStat !== null && currentStat < STAT_MAX
      ? xpCostForPoint(currentStat, character.speed_upgrade_tier || 0)
      : null;

    res.status(200).json({ character, xpNeededForCurrentPoint, upgradeTiers: UPGRADE_TIERS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
