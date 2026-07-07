const STATS = [
  { key: 'strength', label: 'Strength' },
  { key: 'arm', label: 'Arm' },
  { key: 'speed', label: 'Speed' },
  { key: 'build', label: 'Build' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'awareness', label: 'Awareness' }
];

const MAX_REROLLS = 2;

const qb = {};
const qbSource = {};
let currentPlayer = null;
let rerollsLeft = MAX_REROLLS;

const FIGURE_IMG_W = 806;
const FIGURE_IMG_H = 925;
const LABEL_W = 210;
const LABEL_H = 118;
const FIGURE_MARGIN = LABEL_W + 20;
const FIGURE_VIEW_W = FIGURE_IMG_W + FIGURE_MARGIN * 2;
const FIGURE_VIEW_H = FIGURE_IMG_H;

// Anchor points in the source image's own 806x925 coordinate space.
const RAW_ANCHORS = {
  awareness: [370, 10],
  accuracy: [430, 95],
  arm: [95, 115],
  strength: [400, 300],
  build: [740, 210],
  speed: [300, 640]
};

const BODY_ANCHORS = Object.fromEntries(
  Object.entries(RAW_ANCHORS).map(([key, [x, y]]) => [key, [x + FIGURE_MARGIN, y]])
);

const LABEL_ROWS = [15, (FIGURE_VIEW_H - LABEL_H) / 2, FIGURE_VIEW_H - LABEL_H - 15];

const BODY_LABELS = {
  awareness: { x: 10, y: LABEL_ROWS[0], side: 'left' },
  arm: { x: 10, y: LABEL_ROWS[1], side: 'left' },
  speed: { x: 10, y: LABEL_ROWS[2], side: 'left' },
  accuracy: { x: FIGURE_VIEW_W - LABEL_W - 10, y: LABEL_ROWS[0], side: 'right' },
  build: { x: FIGURE_VIEW_W - LABEL_W - 10, y: LABEL_ROWS[1], side: 'right' },
  strength: { x: FIGURE_VIEW_W - LABEL_W - 10, y: LABEL_ROWS[2], side: 'right' }
};

Object.values(BODY_LABELS).forEach((pos) => {
  const edgeX = pos.side === 'left' ? pos.x + LABEL_W : pos.x;
  pos.edge = [edgeX, pos.y + LABEL_H / 2];
});

const statBoard = document.getElementById('stat-board');
const idleState = document.getElementById('idle-state');
const playerCard = document.getElementById('player-card');
const completeState = document.getElementById('complete-state');
const rollBtn = document.getElementById('roll-btn');
const rerollBtn = document.getElementById('reroll-btn');
const playerPhoto = document.getElementById('player-photo');
const playerName = document.getElementById('player-name');
const playerTeam = document.getElementById('player-team');
const playerBio = document.getElementById('player-bio');
const playerStats = document.getElementById('player-stats');

const authSignInBtn = document.getElementById('auth-signin-btn');
const authSignedIn = document.getElementById('auth-signed-in');
const authUsername = document.getElementById('auth-username');
const authSignOutBtn = document.getElementById('auth-signout-btn');
const nameQbState = document.getElementById('name-qb-state');
const nameQbForm = document.getElementById('name-qb-form');
const characterNameInput = document.getElementById('character-name-input');

let characterName = null;

function isSignedIn() {
  return Boolean(window.Clerk && window.Clerk.user);
}

async function authedFetch(url, options = {}) {
  const token = await window.Clerk.session.getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
}

async function saveCharacter(name) {
  if (!isSignedIn()) return;
  try {
    await authedFetch('/api/character-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: name, stats: qb, statSources: qbSource })
    });
  } catch (error) {
    console.error('Failed to save character', error);
  }
}

async function fetchSavedCharacter() {
  if (!isSignedIn()) return null;
  try {
    const res = await authedFetch('/api/character-get');
    if (!res.ok) return null;
    const data = await res.json();
    return data.character || null;
  } catch (error) {
    console.error('Failed to fetch saved character', error);
    return null;
  }
}

function restoreCharacter(saved) {
  STATS.forEach(({ key }) => {
    if (saved.stats && saved.stats[key] !== undefined) qb[key] = saved.stats[key];
    if (saved.stat_sources && saved.stat_sources[key]) qbSource[key] = saved.stat_sources[key];
  });
  characterName = saved.character_name || null;
  renderStatBoard();
  idleState.classList.add('hidden');
  completeState.classList.remove('hidden');
}

function updateAuthUI() {
  if (isSignedIn()) {
    authSignInBtn.classList.add('hidden');
    authSignedIn.classList.remove('hidden');
    const user = window.Clerk.user;
    authUsername.textContent = user.username || user.firstName || 'Player';
    // Matches the username fallback character-save.js uses server-side,
    // so the link always resolves even for email-only accounts.
    authUsername.href = `profile.html?username=${encodeURIComponent(user.username || user.id)}`;
  } else {
    authSignInBtn.classList.remove('hidden');
    authSignedIn.classList.add('hidden');
  }
}

authSignInBtn.addEventListener('click', () => {
  window.Clerk.openSignIn({});
});

authSignOutBtn.addEventListener('click', () => {
  window.Clerk.signOut().then(() => window.location.reload());
});

function initClerk() {
  window.Clerk.load().then(async () => {
    updateAuthUI();
    window.Clerk.addListener(() => updateAuthUI());

    if (window.Clerk.user) {
      const saved = await fetchSavedCharacter();
      if (saved) restoreCharacter(saved);
    }
  });
}

if (window.Clerk) {
  initClerk();
} else {
  window.__clerkLoaded = initClerk;
}

nameQbForm.addEventListener('submit', (e) => {
  e.preventDefault();
  characterName = characterNameInput.value.trim();
  if (!characterName) return;
  saveCharacter(characterName);
  nameQbState.classList.add('hidden');
  completeState.classList.remove('hidden');
});

function renderStatBoard() {
  let callouts = '';
  let labels = '';

  STATS.forEach(({ key, label }) => {
    const [ax, ay] = BODY_ANCHORS[key];
    const pos = BODY_LABELS[key];
    const [ex, ey] = pos.edge;
    const filled = qb[key] !== undefined;
    const source = qbSource[key];
    const bendX = ax + (ex - ax) * 0.6;

    callouts += `<polyline points="${ax},${ay} ${bendX},${ey} ${ex},${ey}" class="callout-line${filled ? ' filled' : ''}" />`;
    callouts += `<circle cx="${ax}" cy="${ay}" r="4.5" class="callout-dot${filled ? ' filled' : ''}" />`;

    labels += `
      <foreignObject x="${pos.x}" y="${pos.y}" width="${LABEL_W}" height="${LABEL_H}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="body-label${filled ? ' filled' : ''}">
          <span class="body-label-name">${label}</span>
          <span class="body-label-value">${filled ? qb[key] : '—'}</span>
          <span class="body-label-source">${filled ? source.name : 'Not rolled yet'}</span>
        </div>
      </foreignObject>
    `;
  });

  statBoard.innerHTML = `
    <svg viewBox="0 0 ${FIGURE_VIEW_W} ${FIGURE_VIEW_H}" class="qb-figure-svg" xmlns="http://www.w3.org/2000/svg">
      <image href="qb-figure.png" x="${FIGURE_MARGIN}" y="0" width="${FIGURE_IMG_W}" height="${FIGURE_IMG_H}" class="qb-figure-img" />
      ${callouts}
      ${labels}
    </svg>
  `;
}

function randomPlayer() {
  return QB_POOL[Math.floor(Math.random() * QB_POOL.length)];
}

function renderPlayerCard() {
  const team = TEAMS.find((t) => t.abbr === currentPlayer.team);

  playerPhoto.src = currentPlayer.photo;
  playerName.textContent = currentPlayer.name;
  playerTeam.textContent = team ? `${team.name} — ${team.conf} ${team.div}` : currentPlayer.team;
  playerBio.textContent = `QB · #${currentPlayer.jersey} · ${currentPlayer.experience} yrs exp · ${currentPlayer.college}`;
  playerStats.innerHTML = '';

  STATS.forEach(({ key, label }) => {
    const taken = qb[key] !== undefined;
    const row = document.createElement('div');
    row.className = 'stat-row' + (taken ? ' taken' : '');
    row.innerHTML = `
      <div class="stat-row-info">
        <span class="stat-row-label">${label}</span>
        <span class="stat-row-value">${currentPlayer.stats[key]}</span>
      </div>
      <button type="button">Take</button>
    `;
    if (!taken) {
      row.querySelector('button').addEventListener('click', () => takeStat(key));
    }
    playerStats.appendChild(row);
  });

  rerollBtn.textContent = `Reroll (${rerollsLeft} left)`;
  rerollBtn.disabled = rerollsLeft <= 0;
}

function takeStat(key) {
  qb[key] = currentPlayer.stats[key];
  qbSource[key] = { name: currentPlayer.name, photo: currentPlayer.photo };
  currentPlayer = null;
  renderStatBoard();

  const allFilled = STATS.every(({ key }) => qb[key] !== undefined);
  playerCard.classList.add('hidden');

  if (allFilled) {
    idleState.classList.add('hidden');
    if (isSignedIn()) {
      nameQbState.classList.remove('hidden');
    } else {
      completeState.classList.remove('hidden');
    }
  } else {
    idleState.classList.remove('hidden');
  }
}

const teamBtn = document.getElementById('team-btn');
const teamRollAnim = document.getElementById('team-roll-anim');
const rollLogo = document.getElementById('roll-logo');
const rollAbbr = document.getElementById('roll-abbr');
const teamCard = document.getElementById('team-card');
const teamLogo = document.getElementById('team-logo');
const teamName = document.getElementById('team-name');
const teamConf = document.getElementById('team-conf');
const seasonSim = document.getElementById('season-sim');
const simWeek = document.getElementById('sim-week');
const scoreYou = document.getElementById('score-you');
const scoreOpp = document.getElementById('score-opp');
const simFlash = document.getElementById('sim-flash');
const weekTracker = document.getElementById('week-tracker');
const simTally = document.getElementById('sim-tally');
const clutchMoment = document.getElementById('clutch-moment');
const clutchSituationEl = document.getElementById('clutch-situation');
const clutchPlays = document.getElementById('clutch-plays');
const clutchOutcome = document.getElementById('clutch-outcome');
const seasonResult = document.getElementById('season-result');
const resultRecord = document.getElementById('result-record');
const resultMsg = document.getElementById('result-msg');
const continueBtn = document.getElementById('continue-btn');
const retryBtn = document.getElementById('retry-btn');

const playoffState = document.getElementById('playoff-state');
const playoffRoundLabel = document.getElementById('playoff-round-label');
const gameField = document.getElementById('game-field');
const ball = document.getElementById('ball');
const playFlash = document.getElementById('play-flash');
const playoffYourLogo = document.getElementById('playoff-your-logo');
const playoffOppLogo = document.getElementById('playoff-opp-logo');
const playoffYourScore = document.getElementById('playoff-your-score');
const playoffOppScore = document.getElementById('playoff-opp-score');
const playoffYourName = document.getElementById('playoff-your-name');
const playoffOppName = document.getElementById('playoff-opp-name');
const playoffResult = document.getElementById('playoff-result');
const playoffResultMsg = document.getElementById('playoff-result-msg');
const playoffRetryBtn = document.getElementById('playoff-retry-btn');

let currentTeam = null;
let currentSeed = null;
let currentSeasonWins = null;
let currentSeasonLosses = null;

async function postSeasonResult(team, wins, losses, qualified, finish) {
  if (!isSignedIn()) return;
  try {
    await authedFetch('/api/season-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamAbbr: team.abbr,
        teamName: team.name,
        teamColor: team.color,
        wins,
        losses,
        qualified,
        finish
      })
    });
  } catch (error) {
    console.error('Failed to save season result', error);
  }
}

function teamLogoUrl(abbr) {
  const slug = abbr === 'WAS' ? 'wsh' : abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

function qbOverall() {
  const values = STATS.map(({ key }) => qb[key]);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function simulateSeason(teamOverall) {
  const log = [];
  for (let week = 1; week <= 17; week++) {
    const oppRating = 65 + Math.random() * 30;
    let winProb = 0.5 + (teamOverall - oppRating) / 150;
    winProb = Math.min(0.92, Math.max(0.08, winProb));
    log.push({ week, winProb, win: null, pivotal: false });
  }

  // 3-5 games come down to a final play the user calls. Favor the
  // closest matchups, with jitter so it's not the same picks every run.
  const clutchCount = 3 + Math.floor(Math.random() * 3);
  [...log]
    .sort((a, b) =>
      (Math.abs(a.winProb - 0.5) + Math.random() * 0.15) -
      (Math.abs(b.winProb - 0.5) + Math.random() * 0.15))
    .slice(0, clutchCount)
    .forEach((game) => { game.pivotal = true; });

  log.forEach((game) => {
    if (!game.pivotal) game.win = Math.random() < game.winProb;
  });

  return log;
}

function generateScore(win, close) {
  const base = 14 + Math.floor(Math.random() * 21);
  const margin = close
    ? 1 + Math.floor(Math.random() * 5)
    : 7 + Math.floor(Math.random() * 18);
  if (win) {
    return { you: base, opp: Math.max(3, base - margin) };
  }
  return { you: Math.max(3, base - margin), opp: base };
}

const CLUTCH_PLAYS = [
  {
    name: 'Deep Shot',
    desc: 'Launch it downfield',
    stats: ['arm', 'accuracy'],
    floor: 42, range: 62, min: 0.2, max: 0.88,
    success: 'TOUCHDOWN BOMB!',
    fail: 'PICKED OFF DEEP!'
  },
  {
    name: 'QB Scramble',
    desc: 'Tuck it and run',
    stats: ['speed', 'strength'],
    floor: 40, range: 62, min: 0.22, max: 0.86,
    success: 'HE TAKES OFF — TOUCHDOWN!',
    fail: 'STUFFED AT THE LINE!'
  },
  {
    name: 'Quick Slant',
    desc: 'The safe, smart throw',
    stats: ['accuracy', 'awareness'],
    floor: 25, range: 75, min: 0.4, max: 0.78,
    success: 'THREADED IN — SCORE!',
    fail: 'BATTED DOWN!'
  }
];

function clutchChance(play) {
  const avg = play.stats.reduce((sum, key) => sum + qb[key], 0) / play.stats.length;
  return Math.min(play.max, Math.max(play.min, (avg - play.floor) / play.range));
}

function clutchSituation() {
  const dist = 1 + Math.floor(Math.random() * 8);
  const yard = 12 + Math.floor(Math.random() * 30);
  const deficits = ['Tied game', 'Down by 1', 'Down by 3', 'Down by 4', 'Down by 6'];
  const deficit = deficits[Math.floor(Math.random() * deficits.length)];
  const secs = 8 + Math.floor(Math.random() * 90);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return `4th & ${dist} at the opponent's ${yard}-yard line · ${deficit} · ${clock} left`;
}

function showClutchMoment(game, done) {
  clutchSituationEl.textContent = clutchSituation();
  clutchOutcome.textContent = '';
  clutchOutcome.className = 'clutch-outcome';
  clutchPlays.innerHTML = '';

  CLUTCH_PLAYS.forEach((play) => {
    const chance = clutchChance(play);
    const statNames = play.stats
      .map((key) => STATS.find((s) => s.key === key).label)
      .join(' + ');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clutch-play-btn';
    btn.innerHTML = `
      <span class="clutch-play-main">
        <span class="clutch-play-name">${play.name}</span>
        <span class="clutch-play-desc">${play.desc}</span>
      </span>
      <span class="clutch-play-odds">${Math.round(chance * 100)}%<small>${statNames}</small></span>
    `;
    btn.addEventListener('click', () => resolveClutch(play, chance, game, done));
    clutchPlays.appendChild(btn);
  });

  clutchMoment.classList.remove('hidden');
}

function resolveClutch(play, chance, game, done) {
  clutchPlays.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  clutchOutcome.textContent = 'The snap is up...';

  setTimeout(() => {
    const success = Math.random() < chance;
    game.win = success;
    clutchOutcome.textContent = success ? play.success : play.fail;
    clutchOutcome.classList.add(success ? 'win' : 'loss');

    setTimeout(() => {
      clutchMoment.classList.add('hidden');
      done();
    }, 1200);
  }, 900);
}

function determinePlayoffs(wins) {
  if (wins >= 14) return { qualified: true, seed: 1 };
  if (wins === 13) return { qualified: true, seed: 2 };
  if (wins === 12) return { qualified: true, seed: 3 };
  if (wins === 11) return { qualified: true, seed: 4 };
  if (wins === 10) return { qualified: Math.random() < 0.85, seed: 5 };
  if (wins === 9) return { qualified: Math.random() < 0.55, seed: 6 };
  if (wins === 8) return { qualified: Math.random() < 0.2, seed: 7 };
  return { qualified: false, seed: null };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function popEl(el) {
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function pickOpponent(conf, excludeAbbrs, minRating) {
  let pool = TEAMS.filter((t) => t.conf === conf && !excludeAbbrs.includes(t.abbr) && t.rating >= minRating);
  if (pool.length === 0) {
    pool = TEAMS.filter((t) => t.conf === conf && !excludeAbbrs.includes(t.abbr));
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildGameDrives(win) {
  const randPlays = (n) => Array.from({ length: n }, () => (Math.random() < 0.6 ? 7 : 3));
  const yourPlays = randPlays(2 + Math.floor(Math.random() * 3));
  const oppPlays = randPlays(2 + Math.floor(Math.random() * 3));
  let yourScore = yourPlays.reduce((a, b) => a + b, 0);
  let oppScore = oppPlays.reduce((a, b) => a + b, 0);

  while (win && yourScore <= oppScore) {
    yourPlays.push(7);
    yourScore += 7;
  }
  while (!win && oppScore <= yourScore) {
    oppPlays.push(7);
    oppScore += 7;
  }

  const drives = [];
  yourPlays.forEach((pts) => drives.push({ side: 'you', pts }));
  oppPlays.forEach((pts) => drives.push({ side: 'opp', pts }));
  for (let i = drives.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [drives[i], drives[j]] = [drives[j], drives[i]];
  }

  return { drives, yourScore, oppScore };
}

function resetGame() {
  STATS.forEach(({ key }) => delete qb[key]);
  STATS.forEach(({ key }) => delete qbSource[key]);
  currentPlayer = null;
  rerollsLeft = MAX_REROLLS;
  renderStatBoard();

  completeState.classList.add('hidden');
  nameQbState.classList.add('hidden');
  characterNameInput.value = '';
  characterName = null;
  teamRollAnim.classList.add('hidden');
  teamRollAnim.classList.remove('settle');
  teamCard.classList.add('hidden');
  seasonSim.classList.add('hidden');
  seasonResult.classList.add('hidden');
  clutchMoment.classList.add('hidden');
  playoffState.classList.add('hidden');
  playoffResult.classList.add('hidden');
  teamBtn.classList.remove('hidden');
  continueBtn.classList.add('hidden');
  retryBtn.classList.add('hidden');
  playoffRetryBtn.classList.add('hidden');
  weekTracker.innerHTML = '';
  currentTeam = null;
  currentSeed = null;
  currentSeasonWins = null;
  currentSeasonLosses = null;

  idleState.classList.remove('hidden');
}

function rollTeamAnimation(target, onDone) {
  const delays = [70, 80, 90, 110, 130, 160, 200, 250, 310, 380, 460];
  const picks = delays.map(() => TEAMS[Math.floor(Math.random() * TEAMS.length)]);
  picks.push(target);

  let i = 0;
  function showPick() {
    const team = picks[i];
    rollLogo.src = teamLogoUrl(team.abbr);
    rollAbbr.textContent = team.abbr;
    teamRollAnim.style.setProperty('--team-color', team.color);
    rollLogo.classList.remove('pop');
    void rollLogo.offsetWidth;
    rollLogo.classList.add('pop');

    if (i < delays.length) {
      setTimeout(() => {
        i += 1;
        showPick();
      }, delays[i]);
    } else {
      teamRollAnim.classList.add('settle');
      setTimeout(onDone, 550);
    }
  }
  showPick();
}

teamBtn.addEventListener('click', () => {
  const team = TEAMS[Math.floor(Math.random() * TEAMS.length)];

  teamBtn.classList.add('hidden');
  teamRollAnim.classList.remove('hidden', 'settle');
  completeState.style.setProperty('--team-color', team.color);

  rollTeamAnimation(team, () => {
    teamRollAnim.classList.add('hidden');

    teamLogo.src = teamLogoUrl(team.abbr);
    teamName.textContent = `${team.name} (${team.abbr})`;
    teamConf.textContent = `${team.conf} ${team.div}`;
    teamCard.classList.remove('hidden');

    seasonResult.classList.add('hidden');
    scoreYou.textContent = '0';
    scoreOpp.textContent = '0';
    simTally.textContent = 'Wins: 0  Losses: 0';

    weekTracker.innerHTML = '';
    const dots = [];
    for (let w = 1; w <= 17; w++) {
      const dot = document.createElement('div');
      dot.className = 'week-dot';
      weekTracker.appendChild(dot);
      dots.push(dot);
    }

    seasonSim.classList.remove('hidden');

    const teamOverall = (qbOverall() + team.rating) / 2;
    const log = simulateSeason(teamOverall);

    function revealResult(i) {
      const game = log[i];
      const win = game.win;
      const { you, opp } = generateScore(win, game.pivotal);
      scoreYou.textContent = you;
      scoreOpp.textContent = opp;
      scoreYou.classList.remove('pop');
      scoreOpp.classList.remove('pop');
      void scoreYou.offsetWidth;
      scoreYou.classList.add('pop');
      scoreOpp.classList.add('pop');

      simFlash.textContent = win ? 'WIN' : 'LOSS';
      simFlash.className = 'sim-flash show ' + (win ? 'win' : 'loss');
      setTimeout(() => simFlash.classList.remove('show'), 300);

      dots[i].classList.remove('active');
      dots[i].classList.add(win ? 'win' : 'loss');

      const winsSoFar = log.slice(0, i + 1).filter((g) => g.win).length;
      const lossesSoFar = i + 1 - winsSoFar;
      simTally.textContent = `Wins: ${winsSoFar}  Losses: ${lossesSoFar}`;

      setTimeout(() => runWeek(i + 1), 240);
    }

    function runWeek(i) {
      if (i >= log.length) {
        const wins = log.filter((g) => g.win).length;
        setTimeout(() => {
          seasonSim.classList.add('hidden');
          showSeasonResult(team, wins, log.length - wins);
        }, 500);
        return;
      }

      const game = log[i];
      simWeek.textContent = `WEEK ${game.week} / 17`;
      dots[i].classList.add('active');

      if (game.pivotal) {
        setTimeout(() => showClutchMoment(game, () => revealResult(i)), 350);
      } else {
        setTimeout(() => revealResult(i), 260);
      }
    }

    runWeek(0);
  });
});

function showSeasonResult(team, wins, losses) {
  resultRecord.textContent = `Final Record: ${wins}-${losses}`;
  const { qualified, seed } = determinePlayoffs(wins);

  if (qualified) {
    resultMsg.textContent = `${team.name} clinched the playoffs as the #${seed} seed!`;
    continueBtn.classList.remove('hidden');
    retryBtn.classList.add('hidden');
    currentTeam = team;
    currentSeed = seed;
    currentSeasonWins = wins;
    currentSeasonLosses = losses;
  } else {
    resultMsg.textContent = `${team.name} missed the playoffs.`;
    continueBtn.classList.add('hidden');
    retryBtn.classList.remove('hidden');
    postSeasonResult(team, wins, losses, false, 'Missed Playoffs');
  }

  seasonResult.classList.remove('hidden');
}

retryBtn.addEventListener('click', resetGame);
playoffRetryBtn.addEventListener('click', resetGame);

async function animateDrive(drive, refs) {
  const target = drive.side === 'you' ? 90 : 10;
  const isFieldGoal = drive.pts === 3;

  ball.classList.remove('kicking');
  if (isFieldGoal) {
    ball.style.setProperty('--spin-dir', drive.side === 'you' ? '1' : '-1');
    void ball.offsetWidth;
    ball.classList.add('kicking');
  }

  ball.style.left = target + '%';
  await wait(1100);

  if (drive.side === 'you') {
    refs.you += drive.pts;
    playoffYourScore.textContent = refs.you;
    popEl(playoffYourScore);
  } else {
    refs.opp += drive.pts;
    playoffOppScore.textContent = refs.opp;
    popEl(playoffOppScore);
  }

  playFlash.textContent = drive.pts === 7 ? 'TOUCHDOWN!' : 'FIELD GOAL';
  playFlash.classList.add('show');
  await wait(500);
  playFlash.classList.remove('show');

  ball.style.transition = 'none';
  ball.style.left = '50%';
  void ball.offsetWidth;
  ball.style.transition = '';
  await wait(400);
}

async function runPlayoffRound(roundIdx, ctx) {
  const { rounds, team, teamOverall, usedOpponents, conf } = ctx;
  const roundName = rounds[roundIdx];
  const isSuperBowl = roundName === 'Super Bowl';
  const minRating = isSuperBowl ? 78 : 60 + roundIdx * 6;

  const opponent = isSuperBowl
    ? pickOpponent(conf === 'AFC' ? 'NFC' : 'AFC', [], minRating)
    : pickOpponent(conf, [team.abbr, ...usedOpponents], minRating);
  usedOpponents.push(opponent.abbr);

  playoffResult.classList.add('hidden');
  playoffState.classList.remove('hidden');
  playoffRoundLabel.textContent = roundName.toUpperCase();
  playoffYourLogo.src = teamLogoUrl(team.abbr);
  playoffOppLogo.src = teamLogoUrl(opponent.abbr);
  playoffYourName.textContent = team.name;
  playoffOppName.textContent = opponent.name;
  playoffYourScore.textContent = '0';
  playoffOppScore.textContent = '0';
  gameField.style.setProperty('--opp-color', opponent.color);
  ball.style.transition = 'none';
  ball.style.left = '50%';
  void ball.offsetWidth;
  ball.style.transition = '';

  const winProb = Math.min(0.85, Math.max(0.15, 0.5 + (teamOverall - opponent.rating) / 140));
  const win = Math.random() < winProb;
  const { drives, yourScore, oppScore } = buildGameDrives(win);

  const refs = { you: 0, opp: 0 };
  for (const drive of drives) {
    await animateDrive(drive, refs);
  }

  await wait(400);

  if (win) {
    if (roundIdx + 1 < rounds.length) {
      playoffRoundLabel.textContent = `${roundName} — WIN ${yourScore}-${oppScore}`;
      await wait(1500);
      runPlayoffRound(roundIdx + 1, ctx);
    } else {
      showPlayoffFinal(true, team, opponent, yourScore, oppScore);
    }
  } else {
    showPlayoffFinal(false, team, opponent, yourScore, oppScore, roundName);
  }
}

function showPlayoffFinal(champion, team, opponent, yourScore, oppScore, lostRound) {
  playoffState.classList.add('hidden');
  playoffResult.classList.remove('hidden');

  const finish = champion
    ? 'Super Bowl Champion'
    : (lostRound === 'Super Bowl' ? 'Lost Super Bowl' : `Lost ${lostRound}`);

  if (champion) {
    playoffResultMsg.textContent = `\u{1F3C6} ${team.name} are Super Bowl Champions! (${yourScore}-${oppScore} in the Super Bowl)`;
  } else {
    playoffResultMsg.textContent = `${team.name} were eliminated in the ${lostRound} (lost ${yourScore}-${oppScore} to ${opponent.name}).`;
  }

  postSeasonResult(team, currentSeasonWins, currentSeasonLosses, true, finish);
  playoffRetryBtn.classList.remove('hidden');
}

continueBtn.addEventListener('click', () => {
  seasonResult.classList.add('hidden');

  const team = currentTeam;
  const seed = currentSeed;
  const teamOverall = (qbOverall() + team.rating) / 2;
  const rounds = seed === 1
    ? ['Divisional Round', 'Conference Championship', 'Super Bowl']
    : ['Wild Card Round', 'Divisional Round', 'Conference Championship', 'Super Bowl'];

  runPlayoffRound(0, { rounds, team, teamOverall, usedOpponents: [], conf: team.conf });
});

rollBtn.addEventListener('click', () => {
  currentPlayer = randomPlayer();
  idleState.classList.add('hidden');
  playerCard.classList.remove('hidden');
  renderPlayerCard();
});

rerollBtn.addEventListener('click', () => {
  if (rerollsLeft <= 0) return;
  rerollsLeft -= 1;
  currentPlayer = randomPlayer();
  renderPlayerCard();
});

renderStatBoard();
