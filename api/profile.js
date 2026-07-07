const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    const username = req.query.username;
    if (!username) {
      res.status(400).json({ error: 'Missing username' });
      return;
    }

    const rows = await sql`
      SELECT username, character_name, stats, image_url, team_abbr, team_name, team_color,
             seasons_played, career_wins, career_losses, playoff_appearances, superbowl_wins, best_finish
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
      stats: row.stats,
      imageUrl: row.image_url,
      teamAbbr: row.team_abbr,
      teamName: row.team_name,
      teamColor: row.team_color,
      seasonsPlayed: row.seasons_played,
      careerWins: row.career_wins,
      careerLosses: row.career_losses,
      playoffAppearances: row.playoff_appearances,
      superbowlWins: row.superbowl_wins,
      bestFinish: row.best_finish
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
