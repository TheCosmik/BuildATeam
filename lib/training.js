const { sql } = require('./db');

const STAT_FLOOR = 65; // career starting cap - curve floor
const STAT_MAX = 99;
const MIN_HOURS_PER_POINT = 1;
const MAX_HOURS_PER_POINT = 24;
const CURVE_EXPONENT = 1.5;

// A permanent, escalating shop: each tier costs more Training Points but
// adds to a cumulative speed bonus. Boosts are flat percentages off the
// base XP cost for every point trained afterward.
const UPGRADE_TIERS = [
  { tier: 1, cost: 24, boostPercent: 5, label: 'Better Nutrition Plan' },
  { tier: 2, cost: 72, boostPercent: 15, label: 'Personal Trainer' },
  { tier: 3, cost: 200, boostPercent: 30, label: 'Full Training Facility' }
];

const TRAINING_POINT_SECONDS = 3600; // 1 Training Point per real hour, always accruing

function boostPercentForTier(tier) {
  const def = UPGRADE_TIERS.find((t) => t.tier === tier);
  return def ? def.boostPercent : 0;
}

// XP needed to go from currentStat -> currentStat+1. Ramps from
// MIN_HOURS_PER_POINT right off the 65 starting cap to MAX_HOURS_PER_POINT
// as the stat approaches 99, then reduced by any purchased speed boost.
function xpCostForPoint(currentStat, speedUpgradeTier) {
  const clamped = Math.max(STAT_FLOOR, Math.min(STAT_MAX - 1, currentStat));
  const progress = (clamped - STAT_FLOOR) / (STAT_MAX - STAT_FLOOR);
  const hours = MIN_HOURS_PER_POINT + (MAX_HOURS_PER_POINT - MIN_HOURS_PER_POINT) * Math.pow(progress, CURVE_EXPONENT);
  const baseSeconds = Math.round(hours * 3600);
  const boost = boostPercentForTier(speedUpgradeTier);
  return Math.round(baseSeconds / (1 + boost / 100));
}

// Applies any AFK gains earned since the relevant timestamps:
//  - stat XP -> whole stat points, capped at STAT_MAX, each successive
//    point costing more per xpCostForPoint (so a long AFK stretch may
//    bank several points, each pricier than the last)
//  - Training Points -> flat 1/hour, independent of what's being trained
// Both timestamps advance by exactly what was "cashed in" rather than
// resetting to now, so partial progress is never lost.
async function flushProgress(userId, row) {
  const stats = row.stats || {};
  const tier = row.speed_upgrade_tier || 0;
  let newStats = stats;
  let newTrainingStat = row.training_stat;
  let newTrainingStartedAt = row.training_started_at;
  let statsChanged = false;

  if (row.training_stat && row.training_started_at) {
    let current = stats[row.training_stat];
    if (current !== undefined) {
      let elapsedSeconds = Math.floor((Date.now() - new Date(row.training_started_at).getTime()) / 1000);
      let gained = 0;

      while (current + gained < STAT_MAX) {
        const cost = xpCostForPoint(current + gained, tier);
        if (elapsedSeconds < cost) break;
        elapsedSeconds -= cost;
        gained += 1;
      }

      if (gained > 0) {
        newStats = { ...stats, [row.training_stat]: current + gained };
        statsChanged = true;

        if (current + gained >= STAT_MAX) {
          // Nothing left to train on this stat - stop rather than leave
          // training_stat pointing at an already-maxed stat.
          newTrainingStat = null;
          newTrainingStartedAt = null;
        } else {
          newTrainingStartedAt = new Date(Date.now() - elapsedSeconds * 1000).toISOString();
        }
      }
    }
  }

  let newTrainingPoints = row.training_points || 0;
  let newPointsSyncedAt = row.training_points_synced_at;
  let pointsChanged = false;

  if (!newPointsSyncedAt) {
    // Legacy rows created before Training Points existed - start the
    // accrual clock now rather than skipping it forever.
    newPointsSyncedAt = new Date().toISOString();
    pointsChanged = true;
  } else {
    const elapsedSeconds = Math.floor((Date.now() - new Date(newPointsSyncedAt).getTime()) / 1000);
    const gainedPoints = Math.floor(elapsedSeconds / TRAINING_POINT_SECONDS);
    if (gainedPoints > 0) {
      newTrainingPoints = newTrainingPoints + gainedPoints;
      newPointsSyncedAt = new Date(
        new Date(newPointsSyncedAt).getTime() + gainedPoints * TRAINING_POINT_SECONDS * 1000
      ).toISOString();
      pointsChanged = true;
    }
  }

  if (!statsChanged && !pointsChanged) return row;

  await sql`
    UPDATE characters SET
      stats = ${JSON.stringify(newStats)},
      training_stat = ${newTrainingStat},
      training_started_at = ${newTrainingStartedAt},
      training_points = ${newTrainingPoints},
      training_points_synced_at = ${newPointsSyncedAt},
      updated_at = now()
    WHERE user_id = ${userId}
  `;

  return {
    ...row,
    stats: newStats,
    training_stat: newTrainingStat,
    training_started_at: newTrainingStartedAt,
    training_points: newTrainingPoints,
    training_points_synced_at: newPointsSyncedAt
  };
}

module.exports = {
  flushProgress,
  xpCostForPoint,
  boostPercentForTier,
  UPGRADE_TIERS,
  STAT_MAX,
  STAT_FLOOR
};
