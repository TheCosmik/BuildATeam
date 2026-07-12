const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress } = require('../lib/training');
const { SHOP_ITEMS } = require('../lib/shop');

module.exports = async function handler(req, res) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }

    const rows = await sql`
      SELECT stats, training_stat, training_started_at, training_progress, training_points,
             speed_upgrade_tier, inventory, active_boost_percent, active_boost_expires_at
      FROM characters
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No career found for this user' });
      return;
    }

    const character = await flushProgress(userId, rows[0]);

    res.status(200).json({
      items: SHOP_ITEMS,
      balance: character.training_points || 0,
      inventory: character.inventory || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
