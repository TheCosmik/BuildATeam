const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress, xpCostForPoint, STAT_MAX } = require('../lib/training');

const VALID_STATS = ['strength', 'arm', 'speed', 'build', 'accuracy', 'awareness'];

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

    const { stat } = req.body || {};
    if (!VALID_STATS.includes(stat)) {
      res.status(400).json({ error: 'Invalid stat' });
      return;
    }

    const rows = await sql`
      SELECT stats, training_stat, training_started_at, training_progress, training_points,
             training_points_synced_at, speed_upgrade_tier
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No career found for this user' });
      return;
    }

    // Cash in any gains on the previously trained stat before switching.
    const flushed = await flushProgress(userId, rows[0]);

    if (flushed.stats[stat] >= STAT_MAX) {
      res.status(400).json({ error: 'Stat already maxed' });
      return;
    }

    const now = new Date().toISOString();

    await sql`
      UPDATE characters SET
        training_stat = ${stat},
        training_started_at = ${now},
        updated_at = now()
      WHERE user_id = ${userId}
    `;

    res.status(200).json({
      stats: flushed.stats,
      trainingStat: stat,
      trainingStartedAt: now,
      xpNeededForCurrentPoint: xpCostForPoint(flushed.stats[stat], flushed.speed_upgrade_tier || 0),
      xpBanked: (flushed.training_progress && flushed.training_progress[stat]) || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
