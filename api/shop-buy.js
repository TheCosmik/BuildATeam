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

    const character = await flushProgress(userId, rows[0]);
    const balance = character.training_points || 0;

    if (balance < item.price) {
      res.status(400).json({ error: 'Not enough money' });
      return;
    }

    const newBalance = balance - item.price;
    const inventory = character.inventory || {};
    const newInventory = { ...inventory, [item.id]: (inventory[item.id] || 0) + 1 };

    await sql`
      UPDATE characters SET
        training_points = ${newBalance},
        inventory = ${JSON.stringify(newInventory)},
        updated_at = now()
      WHERE user_id = ${userId}
    `;

    res.status(200).json({ balance: newBalance, inventory: newInventory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
