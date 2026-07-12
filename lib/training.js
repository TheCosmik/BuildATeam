const { sql } = require('./db');

// 1 XP per elapsed second, 1,200 XP (20 minutes) per stat point - same
// real-world pace as before, just exposed at a finer grain for a visible
// XP bar instead of a flat "next point in N minutes" timer.
const XP_PER_POINT = 1200;
const STAT_MAX = 99;

// Applies any AFK gains earned since training_started_at, capped so the
// trained stat never exceeds STAT_MAX. Advances training_started_at by
// exactly the whole points that were "cashed in" rather than resetting to
// now, so partial XP toward the next point is never lost.
async function flushTraining(userId, row) {
  if (!row.training_stat || !row.training_started_at) return row;

  const stats = row.stats || {};
  const current = stats[row.training_stat];
  if (current === undefined) return row;

  const elapsedSeconds = Math.floor((Date.now() - new Date(row.training_started_at).getTime()) / 1000);
  const gained = Math.min(
    Math.floor(elapsedSeconds / XP_PER_POINT),
    STAT_MAX - current
  );

  if (gained <= 0) return row;

  const newStats = { ...stats, [row.training_stat]: current + gained };
  const newTrainingStartedAt = new Date(
    new Date(row.training_started_at).getTime() + gained * XP_PER_POINT * 1000
  );

  await sql`
    UPDATE characters SET
      stats = ${JSON.stringify(newStats)},
      training_started_at = ${newTrainingStartedAt.toISOString()},
      updated_at = now()
    WHERE user_id = ${userId}
  `;

  return { ...row, stats: newStats, training_started_at: newTrainingStartedAt.toISOString() };
}

module.exports = { flushTraining, XP_PER_POINT, STAT_MAX };
