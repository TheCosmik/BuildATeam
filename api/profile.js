const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    const username = req.query.username;
    if (!username) {
      res.status(400).json({ error: 'Missing username' });
      return;
    }

    const rows = await sql`
      SELECT username, character_name, superbowl_wins
      FROM characters
      WHERE username = ${username}
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const row = rows[0];
    res.status(200).json({
      username: row.username,
      characterName: row.character_name,
      superbowlWins: row.superbowl_wins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
