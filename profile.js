const profileStatus = document.getElementById('profile-status');
const profileCard = document.getElementById('profile-card');

const params = new URLSearchParams(window.location.search);
const username = params.get('username');

async function loadProfile() {
  if (!username) {
    profileStatus.textContent = 'No username specified.';
    return;
  }

  try {
    const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    if (!res.ok) {
      profileStatus.textContent = 'Profile not found.';
      return;
    }

    const data = await res.json();
    profileCard.innerHTML = `
      <p class="profile-username">${data.username}</p>
      <p class="profile-character">${data.characterName || 'No character yet'}</p>
      <p class="profile-wins">${data.superbowlWins} Super Bowl${data.superbowlWins === 1 ? '' : 's'} won</p>
    `;
  } catch (error) {
    profileStatus.textContent = 'Could not load profile.';
  }
}

loadProfile();
