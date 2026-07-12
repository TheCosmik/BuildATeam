const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');

const MAX_URL_LENGTH = 2000;

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

    const { avatarUrl } = req.body || {};

    // Empty string clears back to the Clerk-derived avatar.
    if (avatarUrl === '' || avatarUrl === null || avatarUrl === undefined) {
      await sql`UPDATE characters SET custom_avatar_url = NULL, updated_at = now() WHERE user_id = ${userId}`;
      res.status(200).json({ customAvatarUrl: null });
      return;
    }

    const trimmed = String(avatarUrl).trim();
    if (trimmed.length > MAX_URL_LENGTH || !/^https?:\/\//i.test(trimmed)) {
      res.status(400).json({ error: 'Must be a valid http(s) image link' });
      return;
    }

    const rows = await sql`
      UPDATE characters SET custom_avatar_url = ${trimmed}, updated_at = now()
      WHERE user_id = ${userId}
      RETURNING custom_avatar_url
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No career found for this user' });
      return;
    }

    res.status(200).json({ customAvatarUrl: rows[0].custom_avatar_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
