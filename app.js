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
const seasonResult = document.getElementById('season-result');
const resultRecord = document.getElementById('result-record');
const resultMsg = document.getElementById('result-msg');
const continueBtn = document.getElementById('continue-btn');
const retryBtn = document.getElementById('retry-btn');

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

function generateScore(win) {
  const base = 14 + Math.floor(Math.random() * 21);
  const margin = 7 + Math.floor(Math.random() * 18);
  if (win) {
    return { you: base, opp: Math.max(3, base - margin) };
  }
  return { you: Math.max(3, base - margin), opp: base };
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
  teamRollAnim.classList.add('hidden');
  teamRollAnim.classList.remove('settle');
  teamCard.classList.add('hidden');
  seasonSim.classList.add('hidden');
  seasonResult.classList.add('hidden');
  teamBtn.classList.remove('hidden');
  continueBtn.classList.add('hidden');
  retryBtn.classList.add('hidden');
  weekTracker.innerHTML = '';

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
    const { wins, losses, log } = simulateSeason(teamOverall);

    function runWeek(i) {
      if (i >= log.length) {
        setTimeout(() => {
          seasonSim.classList.add('hidden');
          showSeasonResult(team, wins, losses);
        }, 500);
        return;
      }

      const { week, win } = log[i];
      simWeek.textContent = `WEEK ${week} / 17`;
      dots[i].classList.add('active');

      setTimeout(() => {
        const { you, opp } = generateScore(win);
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
      }, 260);
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
