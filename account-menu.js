// Shared account-menu widget (top-right avatar/name button + dropdown)
// included on every page. Self-contained so it can't collide with each
// page's own script (career.js, app.js, profile.js each have their own
// separately-scoped isSignedIn/authedFetch for their own API calls).
//
// Also owns the single window.__clerkLoaded hook the Clerk <script onload>
// attribute invokes, exposing window.onClerkReady(callback) so page
// scripts can register their own Clerk-dependent init without fighting
// over that one hook.
(function () {
  window.__clerkReadyQueue = window.__clerkReadyQueue || [];
  window.onClerkReady = function (callback) {
    if (window.Clerk) {
      window.Clerk.load().then(callback);
    } else {
      window.__clerkReadyQueue.push(callback);
    }
  };
  window.__clerkLoaded = function () {
    const queue = window.__clerkReadyQueue || [];
    window.__clerkReadyQueue = [];
    queue.forEach((callback) => window.Clerk.load().then(callback));
  };

  const authSignInBtn = document.getElementById('auth-signin-btn');
  const accountMenu = document.getElementById('account-menu');
  const accountMenuBtn = document.getElementById('account-menu-btn');
  const accountAvatar = document.getElementById('account-avatar');
  const accountName = document.getElementById('account-name');
  const accountDropdown = document.getElementById('account-dropdown');
  const accountProfileLink = document.getElementById('account-profile-link');
  const accountSignOutBtn = document.getElementById('account-signout-btn');

  function isSignedIn() {
    return Boolean(window.Clerk && window.Clerk.user);
  }

  async function fetchCareerSummary() {
    try {
      const token = await window.Clerk.session.getToken();
      const res = await fetch('/api/career-get', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.character || null;
    } catch (error) {
      return null;
    }
  }

  async function refreshAccountMenu() {
    if (!isSignedIn()) {
      authSignInBtn.classList.remove('hidden');
      accountMenu.classList.add('hidden');
      accountDropdown.classList.add('hidden');
      return;
    }

    authSignInBtn.classList.add('hidden');
    accountMenu.classList.remove('hidden');

    const user = window.Clerk.user;
    accountAvatar.src = user.imageUrl || '';
    accountName.textContent = user.username || user.firstName || 'Player';
    accountProfileLink.href = `profile.html?username=${encodeURIComponent(user.username || user.id)}`;

    const character = await fetchCareerSummary();
    if (character && character.character_name) accountName.textContent = character.character_name;
    if (character && character.custom_avatar_url) accountAvatar.src = character.custom_avatar_url;
  }

  authSignInBtn.addEventListener('click', () => window.Clerk.openSignIn({}));
  accountSignOutBtn.addEventListener('click', () => {
    window.Clerk.signOut().then(() => window.location.reload());
  });

  accountMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accountDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!accountDropdown.classList.contains('hidden') && !e.target.closest('.account-menu')) {
      accountDropdown.classList.add('hidden');
    }
  });

  // Exposed so page scripts can force an update - e.g. career.js calls
  // this right after a QB is created so the name here doesn't wait for
  // a full page reload to stop showing the Clerk username/"Player".
  window.refreshAccountMenu = refreshAccountMenu;

  window.onClerkReady(() => {
    refreshAccountMenu();
    window.Clerk.addListener(() => refreshAccountMenu());
  });
})();
