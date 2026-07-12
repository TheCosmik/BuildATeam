const STATS = [
  { key: 'strength', label: 'Strength' },
  { key: 'arm', label: 'Arm' },
  { key: 'speed', label: 'Speed' },
  { key: 'build', label: 'Build' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'awareness', label: 'Awareness' }
];

const CAREER_STAT_CAP = 65;
const MAX_REROLLS = 2;

const qb = {};
const qbSource = {};
let currentPlayer = null;
let rerollsLeft = MAX_REROLLS;
let characterName = null;

const FIGURE_IMG_W = 806;
const FIGURE_IMG_H = 925;
const LABEL_W = 210;
const LABEL_H = 118;
const FIGURE_MARGIN = LABEL_W + 20;
const FIGURE_VIEW_W = FIGURE_IMG_W + FIGURE_MARGIN * 2;
const FIGURE_VIEW_H = FIGURE_IMG_H;

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

const careerSignin = document.getElementById('career-signin');
const careerSigninBtn = document.getElementById('career-signin-btn');
const careerLoading = document.getElementById('career-loading');
const careerCreate = document.getElementById('career-create');
const careerCreateBtn = document.getElementById('career-create-btn');
const careerBuilder = document.getElementById('career-builder');
const careerStatBoard = document.getElementById('career-stat-board');
const careerIdleState = document.getElementById('career-idle-state');
const careerRollBtn = document.getElementById('career-roll-btn');
const careerPlayerCard = document.getElementById('career-player-card');
const careerPlayerPhoto = document.getElementById('career-player-photo');
const careerPlayerName = document.getElementById('career-player-name');
const careerPlayerTeam = document.getElementById('career-player-team');
const careerPlayerBio = document.getElementById('career-player-bio');
const careerPlayerStats = document.getElementById('career-player-stats');
const careerRerollBtn = document.getElementById('career-reroll-btn');
const careerNameState = document.getElementById('career-name-state');
const careerNameForm = document.getElementById('career-name-form');
const careerNameInput = document.getElementById('career-name-input');
const careerTeamPicker = document.getElementById('career-team-picker');
const careerTeamGrid = document.getElementById('career-team-grid');
const careerProfile = document.getElementById('career-profile');

const authSignInBtn = document.getElementById('auth-signin-btn');
const authSignedIn = document.getElementById('auth-signed-in');
const authUsername = document.getElementById('auth-username');
const authSignOutBtn = document.getElementById('auth-signout-btn');

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

function updateAuthUI() {
  if (isSignedIn()) {
    authSignInBtn.classList.add('hidden');
    authSignedIn.classList.remove('hidden');
    const user = window.Clerk.user;
    authUsername.textContent = user.username || user.firstName || 'Player';
    authUsername.href = `profile.html?username=${encodeURIComponent(user.username || user.id)}`;
  } else {
    authSignInBtn.classList.remove('hidden');
    authSignedIn.classList.add('hidden');
  }
}

authSignInBtn.addEventListener('click', () => window.Clerk.openSignIn({}));
careerSigninBtn.addEventListener('click', () => window.Clerk.openSignIn({}));
authSignOutBtn.addEventListener('click', () => {
  window.Clerk.signOut().then(() => window.location.reload());
});

function hideAllGates() {
  careerSignin.classList.add('hidden');
  careerLoading.classList.add('hidden');
  careerCreate.classList.add('hidden');
  careerBuilder.classList.add('hidden');
  careerTeamPicker.classList.add('hidden');
  careerProfile.classList.add('hidden');
}

async function loadCareer() {
  hideAllGates();

  if (!isSignedIn()) {
    careerSignin.classList.remove('hidden');
    return;
  }

  careerLoading.classList.remove('hidden');

  try {
    const res = await authedFetch('/api/career-get');
    if (!res.ok) throw new Error('Failed to load career');
    const data = await res.json();

    if (!data.character || !data.character.character_name) {
      hideAllGates();
      careerCreate.classList.remove('hidden');
      return;
    }

    if (!data.character.team_abbr) {
      // Legacy row from before team selection was required at creation.
      STATS.forEach(({ key }) => {
        if (data.character.stats && data.character.stats[key] !== undefined) qb[key] = data.character.stats[key];
        if (data.character.stat_sources && data.character.stat_sources[key]) qbSource[key] = data.character.stat_sources[key];
      });
      characterName = data.character.character_name;
      hideAllGates();
      renderTeamPicker();
      return;
    }

    hideAllGates();
    renderCareerProfile(data.character, data.trainMinutesPerPoint);
    careerProfile.classList.remove('hidden');
  } catch (error) {
    hideAllGates();
    careerLoading.classList.remove('hidden');
    careerLoading.querySelector('p').textContent = 'Could not load your career. Refresh to try again.';
  }
}

function initClerk() {
  window.Clerk.load().then(() => {
    updateAuthUI();
    window.Clerk.addListener(() => updateAuthUI());
    loadCareer();
  });
}

if (window.Clerk) {
  initClerk();
} else {
  window.__clerkLoaded = initClerk;
}

// ---- QB builder (roll/reroll/take, capped at CAREER_STAT_CAP) ----

function renderCareerStatBoard() {
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

  careerStatBoard.innerHTML = `
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

function renderCareerPlayerCard() {
  const team = TEAMS.find((t) => t.abbr === currentPlayer.team);

  careerPlayerPhoto.src = currentPlayer.photo;
  careerPlayerName.textContent = currentPlayer.name;
  careerPlayerTeam.textContent = team ? `${team.name} — ${team.conf} ${team.div}` : currentPlayer.team;
  careerPlayerBio.textContent = `QB · #${currentPlayer.jersey} · ${currentPlayer.experience} yrs exp · ${currentPlayer.college}`;
  careerPlayerStats.innerHTML = '';

  STATS.forEach(({ key, label }) => {
    const taken = qb[key] !== undefined;
    const cappedValue = Math.min(currentPlayer.stats[key], CAREER_STAT_CAP);
    const row = document.createElement('div');
    row.className = 'stat-row' + (taken ? ' taken' : '');
    row.innerHTML = `
      <div class="stat-row-info">
        <span class="stat-row-label">${label}</span>
        <span class="stat-row-value">${cappedValue}</span>
      </div>
      <button type="button">Take</button>
    `;
    if (!taken) {
      row.querySelector('button').addEventListener('click', () => takeStat(key, cappedValue));
    }
    careerPlayerStats.appendChild(row);
  });

  careerRerollBtn.textContent = `Reroll (${rerollsLeft} left)`;
  careerRerollBtn.disabled = rerollsLeft <= 0;
}

function takeStat(key, cappedValue) {
  qb[key] = cappedValue;
  qbSource[key] = { name: currentPlayer.name, photo: currentPlayer.photo };
  currentPlayer = null;
  renderCareerStatBoard();

  const allFilled = STATS.every(({ key }) => qb[key] !== undefined);
  careerPlayerCard.classList.add('hidden');

  if (allFilled) {
    careerIdleState.classList.add('hidden');
    careerNameState.classList.remove('hidden');
  } else {
    careerIdleState.classList.remove('hidden');
  }
}

careerCreateBtn.addEventListener('click', () => {
  STATS.forEach(({ key }) => { delete qb[key]; delete qbSource[key]; });
  currentPlayer = null;
  rerollsLeft = MAX_REROLLS;
  characterName = null;
  renderCareerStatBoard();

  careerIdleState.classList.remove('hidden');
  careerPlayerCard.classList.add('hidden');
  careerNameState.classList.add('hidden');
  careerNameInput.value = '';

  hideAllGates();
  careerBuilder.classList.remove('hidden');
});

careerRollBtn.addEventListener('click', () => {
  currentPlayer = randomPlayer();
  careerIdleState.classList.add('hidden');
  careerPlayerCard.classList.remove('hidden');
  renderCareerPlayerCard();
});

careerRerollBtn.addEventListener('click', () => {
  if (rerollsLeft <= 0) return;
  rerollsLeft -= 1;
  currentPlayer = randomPlayer();
  renderCareerPlayerCard();
});

careerNameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = careerNameInput.value.trim();
  if (!name) return;
  characterName = name;
  hideAllGates();
  renderTeamPicker();
});

// ---- Team picker ----

function teamLogoUrl(abbr) {
  const slug = abbr === 'WAS' ? 'wsh' : abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

function renderTeamPicker() {
  careerTeamGrid.innerHTML = '';

  ['AFC', 'NFC'].forEach((conf) => {
    const header = document.createElement('p');
    header.className = 'career-team-conf-label';
    header.textContent = conf;
    careerTeamGrid.appendChild(header);

    const row = document.createElement('div');
    row.className = 'career-team-conf-grid';

    TEAMS.filter((t) => t.conf === conf).forEach((team) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'career-team-card';
      card.style.setProperty('--team-color', team.color);
      card.innerHTML = `
        <img src="${teamLogoUrl(team.abbr)}" alt="" class="career-team-card-logo">
        <span class="career-team-card-name">${team.name}</span>
      `;
      card.addEventListener('click', () => selectTeam(team));
      row.appendChild(card);
    });

    careerTeamGrid.appendChild(row);
  });

  careerTeamPicker.classList.remove('hidden');
}

async function selectTeam(team) {
  careerTeamGrid.querySelectorAll('button').forEach((b) => { b.disabled = true; });

  try {
    const res = await authedFetch('/api/career-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterName,
        stats: qb,
        statSources: qbSource,
        teamAbbr: team.abbr,
        teamName: team.name,
        teamColor: team.color
      })
    });
    if (!res.ok) throw new Error('Failed to save career');
    hideAllGates();
    await loadCareer();
  } catch (error) {
    careerTeamGrid.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  }
}

// ---- Career profile + training ----

function overallTier(overall) {
  if (overall >= 90) return { label: 'Elite', color: '#ffd166' };
  if (overall >= 80) return { label: 'Great', color: '#6be26b' };
  if (overall >= 70) return { label: 'Solid', color: '#5ec8e8' };
  return { label: 'Developing', color: 'rgba(238, 247, 238, 0.6)' };
}

let trainingTickHandle = null;

function trainingCountdownText(trainingStartedAt, trainMinutesPerPoint) {
  const elapsedMs = Date.now() - new Date(trainingStartedAt).getTime();
  const elapsedMinutes = elapsedMs / 60000;
  const remaining = trainMinutesPerPoint - (elapsedMinutes % trainMinutesPerPoint);

  if (elapsedMinutes >= trainMinutesPerPoint) {
    return 'Gains ready — hit refresh to claim!';
  }
  if (remaining >= 60) {
    return `Next point in ${(remaining / 60).toFixed(1)}h`;
  }
  return `Next point in ${Math.ceil(remaining)}m`;
}

function renderCareerProfile(character, trainMinutesPerPoint) {
  if (trainingTickHandle) clearInterval(trainingTickHandle);

  const stats = character.stats || {};
  const overall = Math.round(STATS.reduce((sum, { key }) => sum + stats[key], 0) / STATS.length);
  const tier = overallTier(overall);

  const avatar = character.image_url
    ? `<img class="profile-avatar" src="${character.image_url}" alt="">`
    : `<div class="profile-avatar profile-avatar-empty">?</div>`;

  const teamPill = character.team_abbr
    ? `
      <div class="profile-team-pill" style="--team-color: ${character.team_color || '#6be26b'}">
        <img src="${teamLogoUrl(character.team_abbr)}" alt="" class="profile-team-logo">
        <span>${character.team_name}</span>
      </div>
    `
    : '';

  const statRows = STATS.map(({ key, label }) => {
    const isTraining = character.training_stat === key;
    const action = isTraining
      ? `<span class="career-train-status" data-training-label>${trainingCountdownText(character.training_started_at, trainMinutesPerPoint)}</span>`
      : `<button type="button" class="career-train-btn" data-train="${key}">Workout</button>`;

    return `
      <div class="profile-stat-row career-stat-row${isTraining ? ' training' : ''}">
        <span class="profile-stat-label">${label}</span>
        <div class="profile-stat-bar"><div class="profile-stat-fill" style="width: ${stats[key]}%"></div></div>
        <span class="profile-stat-value">${stats[key]}</span>
        ${action}
      </div>
    `;
  }).join('');

  const record = `${character.career_wins || 0}-${character.career_losses || 0}`;
  const trophies = character.superbowl_wins > 0
    ? '\u{1F3C6}'.repeat(Math.min(character.superbowl_wins, 5)) + (character.superbowl_wins > 5 ? ` +${character.superbowl_wins - 5}` : '')
    : '—';

  careerProfile.innerHTML = `
    <div class="profile-header">
      ${avatar}
      <div class="profile-header-info">
        <p class="profile-character">${character.character_name}</p>
        <p class="profile-username">Career QB</p>
        ${teamPill}
      </div>
      <div class="profile-overall" style="--tier-color: ${tier.color}">
        <span class="profile-overall-value">${overall}</span>
        <span class="profile-overall-label">${tier.label} QB</span>
      </div>
    </div>

    <div class="profile-stats-block">
      <div class="career-stats-head">
        <p class="profile-section-label">QB Ratings &mdash; Workout a stat to train it up over time</p>
        <button type="button" id="career-refresh-btn" class="btn secondary career-refresh-btn">Check Progress</button>
      </div>
      ${statRows}
    </div>

    <div class="profile-career-grid">
      <div class="profile-career-stat">
        <span class="profile-career-value">${character.seasons_played || 0}</span>
        <span class="profile-career-label">Seasons Played</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${record}</span>
        <span class="profile-career-label">Career Record</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${character.playoff_appearances || 0}</span>
        <span class="profile-career-label">Playoff Trips</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${trophies}</span>
        <span class="profile-career-label">Super Bowl Wins</span>
      </div>
    </div>

    <p class="profile-best-finish">Best Finish: <strong>${character.best_finish || 'Not yet determined'}</strong></p>
  `;

  careerProfile.querySelectorAll('[data-train]').forEach((btn) => {
    btn.addEventListener('click', () => startTraining(btn.getAttribute('data-train')));
  });

  const refreshBtn = document.getElementById('career-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadCareer());

  if (character.training_stat) {
    trainingTickHandle = setInterval(() => {
      const label = careerProfile.querySelector('[data-training-label]');
      if (label) label.textContent = trainingCountdownText(character.training_started_at, trainMinutesPerPoint);
    }, 30000);
  }
}

async function startTraining(stat) {
  try {
    const res = await authedFetch('/api/career-train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stat })
    });
    if (!res.ok) throw new Error('Failed to start training');
    await loadCareer();
  } catch (error) {
    // Leave the UI as-is; the user can just try again.
  }
}
