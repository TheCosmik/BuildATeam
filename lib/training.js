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

// Safety cap on any single active window: if a pause beacon is ever missed
// (crash, force-quit) a stale training_started_at won't silently credit the
// whole gap as active time - only up to this many seconds count per flush.
const MAX_ACTIVE_WINDOW_SECONDS = 6 * 3600;

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

// Applies progress since the last checkpoint:
//  - stat training only accrues while training_started_at is set (i.e. the
//    player is actively on the career page - see pause/resume below).
//    Elapsed seconds are added to training_progress[stat] (banked, so
//    switching stats or leaving never loses partial progress toward the
//    next point), then converted into as many whole points as affordable,
//    each successive point costing more per xpCostForPoint.
//  - Training Points accrue independently, flat 1/hour of real time,
//    regardless of pause state - that's a separate slow background trickle.
//
// Pass { pause: true } when the player is leaving the page: this banks
// whatever was earned and clears training_started_at (freezing the clock)
// instead of resetting it to now. Viewing the page again later re-arms a
// fresh training_started_at (see career-get.js), resuming from the banked
// value - so leaving and returning never loses or double-counts progress.
async function flushProgress(userId, row, opts = {}) {
  const pause = !!opts.pause;
  const stats = row.stats || {};
  const tier = row.speed_upgrade_tier || 0;
  const progress = row.training_progress || {};

  let newStats = stats;
  let newProgress = progress;
  let newTrainingStat = row.training_stat;
  let newTrainingStartedAt = row.training_started_at;
  let trainingChanged = false;

  if (row.training_stat && row.training_started_at) {
    const key = row.training_stat;
    const current = stats[key];

    if (current !== undefined) {
      const rawElapsed = Math.floor((Date.now() - new Date(row.training_started_at).getTime()) / 1000);
      const cappedElapsed = Math.min(Math.max(rawElapsed, 0), MAX_ACTIVE_WINDOW_SECONDS);
      let available = (progress[key] || 0) + cappedElapsed;
      let gained = 0;

      while (current + gained < STAT_MAX) {
        const cost = xpCostForPoint(current + gained, tier);
        if (available < cost) break;
        available -= cost;
        gained += 1;
      }

      if (gained > 0) {
        newStats = { ...stats, [key]: current + gained };
      }
      newProgress = { ...progress, [key]: available };
      trainingChanged = true;

      if (current + gained >= STAT_MAX) {
        // Nothing left to train on this stat - stop rather than leave
        // training_stat pointing at an already-maxed stat.
        newTrainingStat = null;
        newTrainingStartedAt = null;
      } else {
        newTrainingStartedAt = pause ? null : new Date().toISOString();
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

  if (!trainingChanged && !pointsChanged) return row;

  await sql`
    UPDATE characters SET
      stats = ${JSON.stringify(newStats)},
      training_stat = ${newTrainingStat},
      training_started_at = ${newTrainingStartedAt},
      training_progress = ${JSON.stringify(newProgress)},
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
    training_progress: newProgress,
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
