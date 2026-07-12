const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress, UPGRADE_TIERS } = require('../lib/training');

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
      SELECT stats, training_stat, training_started_at, training_points, training_points_synced_at, speed_upgrade_tier
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No career found for this user' });
      return;
    }

    const flushed = await flushProgress(userId, rows[0]);
    const currentTier = flushed.speed_upgrade_tier || 0;
    const nextTierDef = UPGRADE_TIERS.find((t) => t.tier === currentTier + 1);

    if (!nextTierDef) {
      res.status(400).json({ error: 'Already at max training tier' });
      return;
    }

    if (flushed.training_points < nextTierDef.cost) {
      res.status(400).json({ error: 'Not enough Training Points' });
      return;
    }

    const newPoints = flushed.training_points - nextTierDef.cost;

    await sql`
      UPDATE characters SET
        training_points = ${newPoints},
        speed_upgrade_tier = ${nextTierDef.tier},
        updated_at = now()
      WHERE user_id = ${userId}
    `;

    res.status(200).json({ trainingPoints: newPoints, speedUpgradeTier: nextTierDef.tier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
