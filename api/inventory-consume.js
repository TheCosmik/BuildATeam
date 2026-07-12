const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');
const { flushProgress } = require('../lib/training');
const { getItem } = require('../lib/shop');

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

    const { itemId } = req.body || {};
    const item = getItem(itemId);
    if (!item) {
      res.status(400).json({ error: 'Unknown item' });
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

    const inventory = rows[0].inventory || {};
    if (!inventory[itemId] || inventory[itemId] < 1) {
      res.status(400).json({ error: "You don't have that item" });
      return;
    }

    // Bank whatever was earned under the OLD boost rate before this one
    // takes effect, so the new percentage only applies going forward.
    const flushed = await flushProgress(userId, rows[0]);

    const newInventory = { ...inventory, [itemId]: inventory[itemId] - 1 };
    if (newInventory[itemId] <= 0) delete newInventory[itemId];

    const expiresAt = new Date(Date.now() + item.boostDurationSeconds * 1000).toISOString();

    await sql`
      UPDATE characters SET
        inventory = ${JSON.stringify(newInventory)},
        active_boost_percent = ${item.boostPercent},
        active_boost_expires_at = ${expiresAt},
        updated_at = now()
      WHERE user_id = ${userId}
    `;

    res.status(200).json({
      inventory: newInventory,
      activeBoostPercent: item.boostPercent,
      activeBoostExpiresAt: expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
