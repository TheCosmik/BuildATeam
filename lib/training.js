const { sql } = require('./db');

const TRAIN_MINUTES_PER_POINT = 20;
const STAT_MAX = 99;

// Applies any AFK gains earned since training_started_at, capped so the
// trained stat never exceeds STAT_MAX. Advances training_started_at by
// exactly the minutes that were "cashed in" rather than resetting to now,
// so partial progress toward the next point is never lost.
async function flushTraining(userId, row) {
  if (!row.training_stat || !row.training_started_at) return row;

  const stats = row.stats || {};
  const current = stats[row.training_stat];
  if (current === undefined) return row;

  const elapsedMs = Date.now() - new Date(row.training_started_at).getTime();
  const elapsedMinutes = elapsedMs / 60000;
  const gained = Math.min(
    Math.floor(elapsedMinutes / TRAIN_MINUTES_PER_POINT),
    STAT_MAX - current
  );

  if (gained <= 0) return row;

  const newStats = { ...stats, [row.training_stat]: current + gained };
  const newTrainingStartedAt = new Date(
    new Date(row.training_started_at).getTime() + gained * TRAIN_MINUTES_PER_POINT * 60000
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

module.exports = { flushTraining, TRAIN_MINUTES_PER_POINT, STAT_MAX };
