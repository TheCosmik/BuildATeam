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
let currentPlayer = null;
let rerollsLeft = MAX_REROLLS;

const statBoard = document.getElementById('stat-board');
const idleState = document.getElementById('idle-state');
const playerCard = document.getElementById('player-card');
const completeState = document.getElementById('complete-state');
const rollBtn = document.getElementById('roll-btn');
const rerollBtn = document.getElementById('reroll-btn');
const playerName = document.getElementById('player-name');
const playerTeam = document.getElementById('player-team');
const playerStats = document.getElementById('player-stats');

function renderStatBoard() {
  statBoard.innerHTML = '';
  STATS.forEach(({ key, label }) => {
    const slot = document.createElement('div');
    const filled = qb[key] !== undefined;
    slot.className = 'stat-slot' + (filled ? ' filled' : '');
    slot.innerHTML = `
      <span class="stat-slot-label">${label}</span>
      <span class="stat-slot-value">${filled ? qb[key] : '—'}</span>
    `;
    statBoard.appendChild(slot);
  });
}

function randomPlayer() {
  return QB_POOL[Math.floor(Math.random() * QB_POOL.length)];
}

function renderPlayerCard() {
  playerName.textContent = currentPlayer.name;
  playerTeam.textContent = currentPlayer.team;
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
  currentPlayer = null;
  renderStatBoard();

  const allFilled = STATS.every(({ key }) => qb[key] !== undefined);
  playerCard.classList.add('hidden');

  if (allFilled) {
    idleState.classList.add('hidden');
    completeState.classList.remove('hidden');
  } else {
    idleState.classList.remove('hidden');
  }
}

const teamBtn = document.getElementById('team-btn');
const teamCard = document.getElementById('team-card');
const teamName = document.getElementById('team-name');
const teamConf = document.getElementById('team-conf');
const seasonSim = document.getElementById('season-sim');
const simTicker = document.getElementById('sim-ticker');
const simTally = document.getElementById('sim-tally');
const seasonResult = document.getElementById('season-result');
const resultRecord = document.getElementById('result-record');
const resultMsg = document.getElementById('result-msg');
const continueBtn = document.getElementById('continue-btn');
const retryBtn = document.getElementById('retry-btn');

function qbOverall() {
  const values = STATS.map(({ key }) => qb[key]);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function simulateSeason(teamOverall) {
  const log = [];
  let wins = 0;
  let losses = 0;
  for (let week = 1; week <= 17; week++) {
    const oppRating = 65 + Math.random() * 30;
    let winProb = 0.5 + (teamOverall - oppRating) / 150;
    winProb = Math.min(0.92, Math.max(0.08, winProb));
    const win = Math.random() < winProb;
    if (win) wins += 1; else losses += 1;
    log.push({ week, win });
  }
  return { wins, losses, log };
}

function determinePlayoffs(wins) {
  if (wins >= 14) return { qualified: true, seed: 1 };
  if (wins >= 12) return { qualified: true, seed: 2 };
  if (wins >= 11) return { qualified: true, seed: 3 };
  if (wins === 10) return { qualified: Math.random() < 0.85, seed: 5 };
  if (wins === 9) return { qualified: Math.random() < 0.55, seed: 6 };
  if (wins === 8) return { qualified: Math.random() < 0.2, seed: 7 };
  return { qualified: false, seed: null };
}

function resetGame() {
  STATS.forEach(({ key }) => delete qb[key]);
  currentPlayer = null;
  rerollsLeft = MAX_REROLLS;
  renderStatBoard();

  completeState.classList.add('hidden');
  teamCard.classList.add('hidden');
  seasonSim.classList.add('hidden');
  seasonResult.classList.add('hidden');
  teamBtn.classList.remove('hidden');
  continueBtn.classList.add('hidden');
  retryBtn.classList.add('hidden');
  simTicker.innerHTML = '';

  idleState.classList.remove('hidden');
}

teamBtn.addEventListener('click', () => {
  const team = TEAMS[Math.floor(Math.random() * TEAMS.length)];

  teamBtn.classList.add('hidden');
  teamName.textContent = `${team.name} (${team.abbr})`;
  teamConf.textContent = `${team.conf} ${team.div}`;
  teamCard.style.setProperty('--team-color', team.color);
  teamCard.classList.remove('hidden');

  seasonResult.classList.add('hidden');
  simTicker.innerHTML = '';
  simTally.textContent = 'Wins: 0  Losses: 0';
  seasonSim.classList.remove('hidden');

  const teamOverall = (qbOverall() + team.rating) / 2;
  const { wins, losses, log } = simulateSeason(teamOverall);

  let i = 0;
  const interval = setInterval(() => {
    if (i >= log.length) {
      clearInterval(interval);
      seasonSim.classList.add('hidden');
      showSeasonResult(team, wins, losses);
      return;
    }
    const { week, win } = log[i];
    const tick = document.createElement('div');
    tick.className = 'sim-tick ' + (win ? 'win' : 'loss');
    tick.innerHTML = `<span>Week ${week}</span><span>${win ? 'WIN' : 'LOSS'}</span>`;
    simTicker.prepend(tick);

    const winsSoFar = log.slice(0, i + 1).filter((g) => g.win).length;
    const lossesSoFar = i + 1 - winsSoFar;
    simTally.textContent = `Wins: ${winsSoFar}  Losses: ${lossesSoFar}`;
    i += 1;
  }, 120);
});

function showSeasonResult(team, wins, losses) {
  resultRecord.textContent = `Final Record: ${wins}-${losses}`;
  const { qualified, seed } = determinePlayoffs(wins);

  if (qualified) {
    resultMsg.textContent = `${team.name} clinched the playoffs as the #${seed} seed!`;
    continueBtn.classList.remove('hidden');
    retryBtn.classList.add('hidden');
  } else {
    resultMsg.textContent = `${team.name} missed the playoffs.`;
    continueBtn.classList.add('hidden');
    retryBtn.classList.remove('hidden');
  }

  seasonResult.classList.remove('hidden');
}

retryBtn.addEventListener('click', resetGame);

rollBtn.addEventListener('click', () => {
  currentPlayer = randomPlayer();
  rerollsLeft = MAX_REROLLS;
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
