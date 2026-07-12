const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress, xpCostForPoint, totalBoostPercent, STAT_MAX } = require('../lib/training');

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
             training_stat, training_started_at, training_progress, training_points,
             speed_upgrade_tier, inventory, active_boost_percent, active_boost_expires_at
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(200).json({ character: null });
      return;
    }

    let character = await flushProgress(userId, rows[0]);

    if (character.training_stat && !character.training_started_at) {
      // Was paused (player had left the page) - viewing it again means
      // they're back, so resume the clock on the same stat.
      const now = new Date().toISOString();
      await sql`UPDATE characters SET training_started_at = ${now}, updated_at = now() WHERE user_id = ${userId}`;
      character = { ...character, training_started_at: now };
    }

    const boost = totalBoostPercent(character.speed_upgrade_tier || 0, character.active_boost_percent, character.active_boost_expires_at);
    const currentStat = character.training_stat ? character.stats[character.training_stat] : null;
    const xpNeededForCurrentPoint = currentStat !== null && currentStat < STAT_MAX
      ? xpCostForPoint(currentStat, boost)
      : null;
    const xpBanked = character.training_stat ? (character.training_progress[character.training_stat] || 0) : 0;

    res.status(200).json({ character, xpNeededForCurrentPoint, xpBanked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
