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

const careerHub = document.getElementById('career-hub');
const careerSideTabs = document.querySelectorAll('.career-side-tab');
const careerGymPanel = document.getElementById('career-gym-panel');
const careerProfilePanel = document.getElementById('career-profile-panel');
const careerShopPanel = document.getElementById('career-shop-panel');
const careerInventoryPanel = document.getElementById('career-inventory-panel');
const hubShopBalance = document.getElementById('hub-shop-balance');
const hubShopItems = document.getElementById('hub-shop-items');
const hubInventoryBoostStatus = document.getElementById('hub-inventory-boost-status');
const hubInventoryItems = document.getElementById('hub-inventory-items');
const hubInventoryEmpty = document.getElementById('hub-inventory-empty');

function isSignedIn() {
  return Boolean(window.Clerk && window.Clerk.user);
}

// Cached alongside every normal request so the pause beacon (fired as the
// page is closing) has a token ready without needing to await Clerk at the
// worst possible moment.
let cachedToken = null;

async function authedFetch(url, options = {}) {
  const token = await window.Clerk.session.getToken();
  cachedToken = token;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
}

// Tells the server to bank current training progress and freeze the clock.
// Fired when the player leaves the career page - training only accrues
// while they're actually here (see loadCareer's visibility listeners).
function pauseTraining() {
  if (!cachedToken) return;
  try {
    fetch('/api/career-pause', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cachedToken}` },
      keepalive: true
    });
  } catch (error) {
    // Best effort - if this is missed, the 6-hour active-window cap in
    // lib/training.js bounds how much stray time could get credited.
  }
}

careerSigninBtn.addEventListener('click', () => window.Clerk.openSignIn({}));

function hideAllGates() {
  careerSignin.classList.add('hidden');
  careerLoading.classList.add('hidden');
  careerCreate.classList.add('hidden');
  careerBuilder.classList.add('hidden');
  careerTeamPicker.classList.add('hidden');
  careerHub.classList.add('hidden');
}

function switchHubTab(tabName) {
  careerSideTabs.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-hub-tab') === tabName);
  });
  careerGymPanel.classList.toggle('hidden', tabName !== 'gym');
  careerProfilePanel.classList.toggle('hidden', tabName !== 'profile');
  careerShopPanel.classList.toggle('hidden', tabName !== 'shop');
  careerInventoryPanel.classList.toggle('hidden', tabName !== 'inventory');

  if (tabName === 'shop') loadShopPanel();
  if (tabName === 'inventory') loadInventoryPanel();
}

careerSideTabs.forEach((btn) => {
  btn.addEventListener('click', () => switchHubTab(btn.getAttribute('data-hub-tab')));
});

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
    renderCareerProfile(data.character);
    renderGymPanel(data.character, data.xpNeededForCurrentPoint, data.xpBanked);
    switchHubTab('profile');
    careerHub.classList.remove('hidden');
  } catch (error) {
    hideAllGates();
    careerLoading.classList.remove('hidden');
    careerLoading.querySelector('p').textContent = 'Could not load your career. Refresh to try again.';
  }
}

window.onClerkReady(() => {
  loadCareer();
  window.Clerk.addListener(() => loadCareer());
});

// Training only accrues while the player is actually here. Leaving the
// page (hiding the tab, navigating away, or closing it) pauses the clock;
// coming back resumes it via loadCareer's normal flush-on-view.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pauseTraining();
  } else if (isSignedIn()) {
    loadCareer();
  }
});

window.addEventListener('pagehide', pauseTraining);

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
    if (window.refreshAccountMenu) window.refreshAccountMenu();
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

// xpBanked is whatever was already earned toward this point in a previous
// session (switched away and back, or left and returned) - the live
// elapsed-since-training_started_at ticks up on top of that baseline.
function xpProgress(trainingStartedAt, xpNeeded, xpBanked) {
  const elapsedSeconds = Math.floor((Date.now() - new Date(trainingStartedAt).getTime()) / 1000);
  const xp = Math.max(0, Math.min(xpBanked + elapsedSeconds, xpNeeded));
  const percent = (xp / xpNeeded) * 100;
  const ready = xp >= xpNeeded;
  return { xp, percent, ready };
}

function xpBarHtml(trainingStartedAt, xpNeeded, xpBanked) {
  const { xp, percent, ready } = xpProgress(trainingStartedAt, xpNeeded, xpBanked);
  const label = ready
    ? 'Point ready — hit Check Progress to claim!'
    : `${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;

  return `
    <div class="career-xp-bar-wrap${ready ? ' ready' : ''}" data-xp-bar>
      <div class="career-xp-bar"><div class="career-xp-fill" data-xp-fill style="width: ${percent}%"></div></div>
      <span class="career-xp-label" data-xp-label>${label}</span>
    </div>
  `;
}

function activeDrinkBoostHtml(character) {
  const expiresAt = character.active_boost_expires_at;
  const active = expiresAt && new Date(expiresAt).getTime() > Date.now();
  if (!active) return '';

  const remainingMin = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000));
  return `<p class="career-drink-boost-active">&#9889; +${character.active_boost_percent}% from a QB XP Boost — ${remainingMin}m left</p>`;
}

function renderCareerProfile(character) {
  const stats = character.stats || {};
  const overall = Math.round(STATS.reduce((sum, { key }) => sum + stats[key], 0) / STATS.length);
  const tier = overallTier(overall);

  const avatarSrc = character.custom_avatar_url || character.image_url;
  const avatarImg = avatarSrc
    ? `<img class="profile-avatar" src="${avatarSrc}" alt="">`
    : `<div class="profile-avatar profile-avatar-empty">?</div>`;

  const avatar = `
    <div class="profile-avatar-wrap" id="profile-avatar-wrap">
      ${avatarImg}
      <button type="button" class="profile-avatar-edit-btn" id="profile-avatar-edit-btn">Edit</button>
      <div class="profile-avatar-form hidden" id="profile-avatar-form">
        <input type="text" id="profile-avatar-input" class="profile-avatar-input" placeholder="Image link (https://...)" value="${avatarSrc || ''}">
        <div class="profile-avatar-form-actions">
          <button type="button" id="profile-avatar-save-btn" class="btn primary profile-avatar-btn">Save</button>
          <button type="button" id="profile-avatar-cancel-btn" class="btn secondary profile-avatar-btn">Cancel</button>
        </div>
        <p class="profile-avatar-hint">Leave blank to use your account photo</p>
      </div>
    </div>
  `;

  const teamPill = character.team_abbr
    ? `
      <div class="profile-team-pill" style="--team-color: ${character.team_color || '#6be26b'}">
        <img src="${teamLogoUrl(character.team_abbr)}" alt="" class="profile-team-logo">
        <span>${character.team_name}</span>
      </div>
    `
    : '';

  const record = `${character.career_wins || 0}-${character.career_losses || 0}`;
  const trophies = character.superbowl_wins > 0
    ? '\u{1F3C6}'.repeat(Math.min(character.superbowl_wins, 5)) + (character.superbowl_wins > 5 ? ` +${character.superbowl_wins - 5}` : '')
    : '—';

  careerProfilePanel.innerHTML = `
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

  const avatarEditBtn = document.getElementById('profile-avatar-edit-btn');
  const avatarForm = document.getElementById('profile-avatar-form');
  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarCancelBtn = document.getElementById('profile-avatar-cancel-btn');
  const avatarSaveBtn = document.getElementById('profile-avatar-save-btn');

  if (avatarEditBtn) {
    avatarEditBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarForm.classList.remove('hidden');
      avatarInput.focus();
    });
  }
  if (avatarCancelBtn) {
    avatarCancelBtn.addEventListener('click', () => avatarForm.classList.add('hidden'));
  }
  if (avatarSaveBtn) {
    avatarSaveBtn.addEventListener('click', () => saveAvatarUrl(avatarInput.value.trim()));
  }
}

function renderGymPanel(character, xpNeededForCurrentPoint, xpBanked) {
  if (trainingTickHandle) clearInterval(trainingTickHandle);

  const stats = character.stats || {};

  const statRows = STATS.map(({ key, label }) => {
    const isTraining = character.training_stat === key;
    const isMaxed = stats[key] >= 99;
    const action = isTraining
      ? `<span class="career-train-status">Training</span>`
      : isMaxed
        ? `<span class="career-train-status career-train-maxed">Maxed</span>`
        : `<button type="button" class="career-train-btn" data-train="${key}">Workout</button>`;
    const xpBar = isTraining ? xpBarHtml(character.training_started_at, xpNeededForCurrentPoint, xpBanked) : '';

    return `
      <div class="profile-stat-row career-stat-row${isTraining ? ' training' : ''}">
        <span class="profile-stat-label">${label}</span>
        <div class="profile-stat-bar"><div class="profile-stat-fill" style="width: ${stats[key]}%"></div></div>
        <span class="profile-stat-value">${stats[key]}</span>
        ${action}
      </div>
      ${xpBar}
    `;
  }).join('');

  careerGymPanel.innerHTML = `
    <div class="profile-stats-block">
      <div class="career-stats-head">
        <p class="profile-section-label">QB Ratings &mdash; Workout a stat to train it up over time</p>
        <button type="button" id="career-refresh-btn" class="btn secondary career-refresh-btn">Check Progress</button>
      </div>
      ${activeDrinkBoostHtml(character)}
      ${statRows}
    </div>
  `;

  careerGymPanel.querySelectorAll('[data-train]').forEach((btn) => {
    btn.addEventListener('click', () => startTraining(btn.getAttribute('data-train')));
  });

  const refreshBtn = document.getElementById('career-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadCareer());

  if (character.training_stat) {
    trainingTickHandle = setInterval(() => {
      const { xp, percent, ready } = xpProgress(character.training_started_at, xpNeededForCurrentPoint, xpBanked);
      const fill = careerGymPanel.querySelector('[data-xp-fill]');
      const label = careerGymPanel.querySelector('[data-xp-label]');
      const wrap = careerGymPanel.querySelector('[data-xp-bar]');
      if (fill) fill.style.width = `${percent}%`;
      if (label) label.textContent = ready ? 'Point ready — hit Check Progress to claim!' : `${xp.toLocaleString()} / ${xpNeededForCurrentPoint.toLocaleString()} XP`;
      if (wrap) wrap.classList.toggle('ready', ready);
    }, 1000);
  }
}

async function saveAvatarUrl(url) {
  try {
    const res = await authedFetch('/api/career-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl: url })
    });
    if (!res.ok) throw new Error('Failed to save avatar');
    await loadCareer();
    if (window.refreshAccountMenu) window.refreshAccountMenu();
  } catch (error) {
    // Leave the form open so the user can fix the link and retry.
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

// ---- Shop panel ----

async function loadShopPanel() {
  hubShopItems.innerHTML = '<p class="profile-empty-note">Loading shop...</p>';

  try {
    const res = await authedFetch('/api/shop-get');
    if (!res.ok) throw new Error('Failed to load shop');
    const data = await res.json();
    renderShopPanel(data.items, data.balance, data.inventory);
  } catch (error) {
    hubShopItems.innerHTML = '<p class="profile-empty-note">Could not load the shop. Try again.</p>';
  }
}

function renderShopPanel(items, balance, inventory) {
  hubShopBalance.textContent = `$${balance}`;

  hubShopItems.innerHTML = items.map((item) => {
    const owned = inventory[item.id] || 0;
    const canAfford = balance >= item.price;
    return `
      <div class="shop-item-card">
        <img src="${item.image}" alt="${item.name}" class="shop-item-image">
        <div class="shop-item-info">
          <span class="shop-item-name">${item.name}</span>
          <span class="shop-item-desc">${item.description}</span>
          ${owned > 0 ? `<span class="shop-item-owned">You own ${owned}</span>` : ''}
        </div>
        <button type="button" class="btn primary shop-item-buy" data-buy="${item.id}" ${canAfford ? '' : 'disabled'}>
          Buy — $${item.price}
        </button>
      </div>
    `;
  }).join('');

  hubShopItems.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => buyItemHub(btn.getAttribute('data-buy')));
  });
}

async function buyItemHub(itemId) {
  try {
    const res = await authedFetch('/api/shop-buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    if (!res.ok) throw new Error('Failed to buy item');
    await loadShopPanel();
  } catch (error) {
    // Leave the UI as-is; the user can just try again.
  }
}

// ---- Inventory panel ----

let hubConfirmingItemId = null;

async function loadInventoryPanel() {
  hubInventoryItems.innerHTML = '<p class="profile-empty-note">Loading inventory...</p>';
  hubInventoryEmpty.classList.add('hidden');

  try {
    const res = await authedFetch('/api/inventory-get');
    if (!res.ok) throw new Error('Failed to load inventory');
    const data = await res.json();
    renderInventoryPanel(data.items, data.inventory, data.activeBoostPercent, data.activeBoostExpiresAt);
  } catch (error) {
    hubInventoryItems.innerHTML = '<p class="profile-empty-note">Could not load your inventory. Try again.</p>';
  }
}

function renderInventoryPanel(catalog, inventory, activeBoostPercent, activeBoostExpiresAt) {
  const active = activeBoostExpiresAt && new Date(activeBoostExpiresAt).getTime() > Date.now();
  if (active) {
    const remainingMin = Math.max(1, Math.ceil((new Date(activeBoostExpiresAt).getTime() - Date.now()) / 60000));
    hubInventoryBoostStatus.textContent = `⚡ +${activeBoostPercent}% training speed active — ${remainingMin}m left`;
    hubInventoryBoostStatus.classList.remove('hidden');
  } else {
    hubInventoryBoostStatus.classList.add('hidden');
  }

  const ownedEntries = Object.entries(inventory).filter(([, qty]) => qty > 0);

  if (ownedEntries.length === 0) {
    hubInventoryItems.innerHTML = '';
    hubInventoryEmpty.classList.remove('hidden');
    return;
  }

  hubInventoryEmpty.classList.add('hidden');

  hubInventoryItems.innerHTML = ownedEntries.map(([itemId, qty]) => {
    const item = catalog.find((i) => i.id === itemId);
    if (!item) return '';
    const confirming = hubConfirmingItemId === itemId;

    return `
      <div class="shop-item-card inventory-item-card">
        <div class="inventory-item-image-wrap" data-item-toggle="${itemId}">
          <img src="${item.image}" alt="${item.name}" class="shop-item-image inventory-item-image">
          <span class="inventory-item-qty">x${qty}</span>
          ${confirming ? `
            <div class="inventory-confirm-overlay">
              <button type="button" class="btn primary inventory-confirm-btn" data-drink="${itemId}">Drink</button>
              <button type="button" class="btn secondary inventory-confirm-btn" data-cancel>Cancel</button>
            </div>
          ` : ''}
        </div>
        <div class="shop-item-info">
          <span class="shop-item-name">${item.name}</span>
          <span class="shop-item-desc">${item.description}</span>
        </div>
      </div>
    `;
  }).join('');

  hubInventoryItems.querySelectorAll('[data-item-toggle]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.inventory-confirm-overlay')) return;
      hubConfirmingItemId = el.getAttribute('data-item-toggle');
      renderInventoryPanel(catalog, inventory, activeBoostPercent, activeBoostExpiresAt);
    });
  });

  hubInventoryItems.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hubConfirmingItemId = null;
      renderInventoryPanel(catalog, inventory, activeBoostPercent, activeBoostExpiresAt);
    });
  });

  hubInventoryItems.querySelectorAll('[data-drink]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      drinkItemHub(btn.getAttribute('data-drink'));
    });
  });
}

async function drinkItemHub(itemId) {
  try {
    const res = await authedFetch('/api/inventory-consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    if (!res.ok) throw new Error('Failed to consume item');
    hubConfirmingItemId = null;
    await loadInventoryPanel();
    await refreshProfilePanel(); // so the new boost shows up immediately if they switch back
  } catch (error) {
    hubConfirmingItemId = null;
  }
}

// Re-fetches and re-renders the Gym + Profile panels' data, without
// touching which hub tab is currently visible - used after drinking a
// boost so it's already reflected (the boost banner + XP bar live in
// Gym) if the player switches back over there.
async function refreshProfilePanel() {
  try {
    const res = await authedFetch('/api/career-get');
    if (!res.ok) return;
    const data = await res.json();
    if (data.character && data.character.team_abbr) {
      renderCareerProfile(data.character);
      renderGymPanel(data.character, data.xpNeededForCurrentPoint, data.xpBanked);
    }
  } catch (error) {
    // Non-critical - the profile will pick up the fresh state next full load.
  }
}

