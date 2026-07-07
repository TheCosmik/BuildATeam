const STATS = [
  { key: 'strength', label: 'Strength' },
  { key: 'arm', label: 'Arm' },
  { key: 'speed', label: 'Speed' },
  { key: 'build', label: 'Build' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'awareness', label: 'Awareness' }
];

const profileStatus = document.getElementById('profile-status');
const profileCard = document.getElementById('profile-card');

const params = new URLSearchParams(window.location.search);
const username = params.get('username');

function teamLogoUrl(abbr) {
  const slug = abbr === 'WAS' ? 'wsh' : abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
}

function overallTier(overall) {
  if (overall >= 90) return { label: 'Elite', color: '#ffd166' };
  if (overall >= 80) return { label: 'Great', color: '#6be26b' };
  if (overall >= 70) return { label: 'Solid', color: '#5ec8e8' };
  return { label: 'Developing', color: 'rgba(238, 247, 238, 0.6)' };
}

function renderProfile(data) {
  const stats = data.stats || {};
  const hasStats = STATS.every(({ key }) => stats[key] !== undefined);
  const overall = hasStats
    ? Math.round(STATS.reduce((sum, { key }) => sum + stats[key], 0) / STATS.length)
    : null;
  const tier = overall !== null ? overallTier(overall) : null;

  const avatar = data.imageUrl
    ? `<img class="profile-avatar" src="${data.imageUrl}" alt="">`
    : `<div class="profile-avatar profile-avatar-empty">?</div>`;

  const teamPill = data.teamAbbr
    ? `
      <div class="profile-team-pill" style="--team-color: ${data.teamColor || '#6be26b'}">
        <img src="${teamLogoUrl(data.teamAbbr)}" alt="" class="profile-team-logo">
        <span>${data.teamName}</span>
      </div>
    `
    : '';

  const overallBadge = overall !== null
    ? `
      <div class="profile-overall" style="--tier-color: ${tier.color}">
        <span class="profile-overall-value">${overall}</span>
        <span class="profile-overall-label">${tier.label} QB</span>
      </div>
    `
    : '';

  const statBars = hasStats
    ? STATS.map(({ key, label }) => `
        <div class="profile-stat-row">
          <span class="profile-stat-label">${label}</span>
          <div class="profile-stat-bar"><div class="profile-stat-fill" style="width: ${stats[key]}%"></div></div>
          <span class="profile-stat-value">${stats[key]}</span>
        </div>
      `).join('')
    : '<p class="profile-empty-note">No QB stats yet.</p>';

  const record = `${data.careerWins || 0}-${data.careerLosses || 0}`;
  const trophies = data.superbowlWins > 0
    ? '\u{1F3C6}'.repeat(Math.min(data.superbowlWins, 5)) + (data.superbowlWins > 5 ? ` +${data.superbowlWins - 5}` : '')
    : '—';

  profileCard.innerHTML = `
    <div class="profile-header">
      ${avatar}
      <div class="profile-header-info">
        <p class="profile-character">${data.characterName || 'No character yet'}</p>
        <p class="profile-username">@${data.username}</p>
        ${teamPill}
      </div>
      ${overallBadge}
    </div>

    <div class="profile-stats-block">
      <p class="profile-section-label">QB Ratings</p>
      ${statBars}
    </div>

    <div class="profile-career-grid">
      <div class="profile-career-stat">
        <span class="profile-career-value">${data.seasonsPlayed || 0}</span>
        <span class="profile-career-label">Seasons Played</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${record}</span>
        <span class="profile-career-label">Career Record</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${data.playoffAppearances || 0}</span>
        <span class="profile-career-label">Playoff Trips</span>
      </div>
      <div class="profile-career-stat">
        <span class="profile-career-value">${trophies}</span>
        <span class="profile-career-label">Super Bowl Wins</span>
      </div>
    </div>

    <p class="profile-best-finish">Best Finish: <strong>${data.bestFinish || 'Not yet determined'}</strong></p>
  `;
}

async function loadProfile() {
  if (!username) {
    profileStatus.textContent = 'No username specified.';
    return;
  }

  try {
    const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    if (res.status === 404) {
      profileStatus.textContent = 'This player hasn\'t built a QB yet.';
      return;
    }
    if (!res.ok) {
      profileStatus.textContent = 'Profile not found.';
      return;
    }

    const data = await res.json();
    renderProfile(data);
  } catch (error) {
    profileStatus.textContent = 'Could not load profile.';
  }
}

loadProfile();
