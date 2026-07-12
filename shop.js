const shopSignin = document.getElementById('shop-signin');
const shopSigninBtn = document.getElementById('shop-signin-btn');
const shopLoading = document.getElementById('shop-loading');
const shopContent = document.getElementById('shop-content');
const shopBalance = document.getElementById('shop-balance');
const shopItems = document.getElementById('shop-items');

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
shopSigninBtn.addEventListener('click', () => window.Clerk.openSignIn({}));
authSignOutBtn.addEventListener('click', () => {
  window.Clerk.signOut().then(() => window.location.reload());
});

function hideAllGates() {
  shopSignin.classList.add('hidden');
  shopLoading.classList.add('hidden');
  shopContent.classList.add('hidden');
}

async function loadShop() {
  hideAllGates();

  if (!isSignedIn()) {
    shopSignin.classList.remove('hidden');
    return;
  }

  shopLoading.classList.remove('hidden');

  try {
    const res = await authedFetch('/api/shop-get');
    if (!res.ok) throw new Error('Failed to load shop');
    const data = await res.json();

    hideAllGates();
    renderShop(data.items, data.balance, data.inventory);
    shopContent.classList.remove('hidden');
  } catch (error) {
    hideAllGates();
    shopLoading.classList.remove('hidden');
    shopLoading.querySelector('p').textContent = 'Could not load the shop. Refresh to try again.';
  }
}

function renderShop(items, balance, inventory) {
  shopBalance.textContent = `$${balance}`;

  shopItems.innerHTML = items.map((item) => {
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

  shopItems.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => buyItem(btn.getAttribute('data-buy')));
  });
}

async function buyItem(itemId) {
  try {
    const res = await authedFetch('/api/shop-buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    if (!res.ok) throw new Error('Failed to buy item');
    await loadShop();
  } catch (error) {
    // Leave the UI as-is; the user can just try again.
  }
}

function initClerk() {
  window.Clerk.load().then(() => {
    updateAuthUI();
    window.Clerk.addListener(() => updateAuthUI());
    loadShop();
  });
}

if (window.Clerk) {
  initClerk();
} else {
  window.__clerkLoaded = initClerk;
}
