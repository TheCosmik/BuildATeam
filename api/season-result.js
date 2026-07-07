const { sql } = require('../lib/db');
const { requireUserId } = require('../lib/clerk-verify');

// Lower rank = better finish. Used so a career's "best finish" only ever
// moves forward, no matter what order seasons are played in.
const FINISH_RANK = {
  'Super Bowl Champion': 0,
  'Lost Super Bowl': 1,
  'Lost Conference Championship': 2,
  'Lost Divisional Round': 3,
  'Lost Wild Card Round': 4,
  'Missed Playoffs': 5
};

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

    const { teamAbbr, teamName, teamColor, wins, losses, qualified, finish } = req.body || {};
    if (!teamAbbr || !teamName || wins === undefined || losses === undefined || !finish) {
      res.status(400).json({ error: 'Missing required season result fields' });
      return;
    }

    const finishRank = FINISH_RANK[finish];
    if (finishRank === undefined) {
      res.status(400).json({ error: 'Unknown finish label' });
      return;
    }

    const rows = await sql`
      UPDATE characters SET
        team_abbr = ${teamAbbr},
        team_name = ${teamName},
        team_color = ${teamColor || null},
        seasons_played = seasons_played + 1,
        career_wins = career_wins + ${wins},
        career_losses = career_losses + ${losses},
        playoff_appearances = playoff_appearances + ${qualified ? 1 : 0},
        superbowl_wins = superbowl_wins + ${finish === 'Super Bowl Champion' ? 1 : 0},
        best_finish = CASE
          WHEN best_finish_rank IS NULL OR ${finishRank} < best_finish_rank THEN ${finish}
          ELSE best_finish
        END,
        best_finish_rank = LEAST(COALESCE(best_finish_rank, 999), ${finishRank}),
        updated_at = now()
      WHERE user_id = ${userId}
      RETURNING seasons_played, career_wins, career_losses, playoff_appearances, superbowl_wins, best_finish
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'No character found for this user' });
      return;
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
