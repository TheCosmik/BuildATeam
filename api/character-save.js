const { createClerkClient } = require('@clerk/backend');
const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

    const { characterName, stats, statSources } = req.body || {};
    if (!characterName || !stats || !statSources) {
      res.status(400).json({ error: 'Missing characterName, stats, or statSources' });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    const username = clerkUser.username || clerkUser.id;
    const imageUrl = clerkUser.imageUrl || null;

    await sql`
      INSERT INTO characters (user_id, username, character_name, stats, stat_sources, image_url, updated_at)
      VALUES (${userId}, ${username}, ${characterName}, ${JSON.stringify(stats)}, ${JSON.stringify(statSources)}, ${imageUrl}, now())
      ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        character_name = EXCLUDED.character_name,
        stats = EXCLUDED.stats,
        stat_sources = EXCLUDED.stat_sources,
        image_url = EXCLUDED.image_url,
        updated_at = now()
    `;

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
