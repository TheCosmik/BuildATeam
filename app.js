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
