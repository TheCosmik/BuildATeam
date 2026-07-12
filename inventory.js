const inventorySignin = document.getElementById('inventory-signin');
const inventorySigninBtn = document.getElementById('inventory-signin-btn');
const inventoryLoading = document.getElementById('inventory-loading');
const inventoryContent = document.getElementById('inventory-content');
const inventoryBoostStatus = document.getElementById('inventory-boost-status');
const inventoryItems = document.getElementById('inventory-items');
const inventoryEmpty = document.getElementById('inventory-empty');

const authSignInBtn = document.getElementById('auth-signin-btn');
const authSignedIn = document.getElementById('auth-signed-in');
const authUsername = document.getElementById('auth-username');
const authSignOutBtn = document.getElementById('auth-signout-btn');

let confirmingItemId = null;

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
inventorySigninBtn.addEventListener('click', () => window.Clerk.openSignIn({}));
authSignOutBtn.addEventListener('click', () => {
  window.Clerk.signOut().then(() => window.location.reload());
});

function hideAllGates() {
  inventorySignin.classList.add('hidden');
  inventoryLoading.classList.add('hidden');
  inventoryContent.classList.add('hidden');
}

async function loadInventory() {
  hideAllGates();

  if (!isSignedIn()) {
    inventorySignin.classList.remove('hidden');
    return;
  }

  inventoryLoading.classList.remove('hidden');

  try {
    const res = await authedFetch('/api/inventory-get');
    if (!res.ok) throw new Error('Failed to load inventory');
    const data = await res.json();

    hideAllGates();
    renderInventory(data.items, data.inventory, data.activeBoostPercent, data.activeBoostExpiresAt);
    inventoryContent.classList.remove('hidden');
  } catch (error) {
    hideAllGates();
    inventoryLoading.classList.remove('hidden');
    inventoryLoading.querySelector('p').textContent = 'Could not load your inventory. Refresh to try again.';
  }
}

function renderInventory(catalog, inventory, activeBoostPercent, activeBoostExpiresAt) {
  const active = activeBoostExpiresAt && new Date(activeBoostExpiresAt).getTime() > Date.now();
  if (active) {
    const remainingMin = Math.max(1, Math.ceil((new Date(activeBoostExpiresAt).getTime() - Date.now()) / 60000));
    inventoryBoostStatus.textContent = `⚡ +${activeBoostPercent}% training speed active — ${remainingMin}m left`;
    inventoryBoostStatus.classList.remove('hidden');
  } else {
    inventoryBoostStatus.classList.add('hidden');
  }

  const ownedEntries = Object.entries(inventory).filter(([, qty]) => qty > 0);

  if (ownedEntries.length === 0) {
    inventoryItems.innerHTML = '';
    inventoryEmpty.classList.remove('hidden');
    return;
  }

  inventoryEmpty.classList.add('hidden');

  inventoryItems.innerHTML = ownedEntries.map(([itemId, qty]) => {
    const item = catalog.find((i) => i.id === itemId);
    if (!item) return '';
    const confirming = confirmingItemId === itemId;

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

  inventoryItems.querySelectorAll('[data-item-toggle]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.inventory-confirm-overlay')) return;
      confirmingItemId = el.getAttribute('data-item-toggle');
      renderInventory(catalog, inventory, activeBoostPercent, activeBoostExpiresAt);
    });
  });

  inventoryItems.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmingItemId = null;
      renderInventory(catalog, inventory, activeBoostPercent, activeBoostExpiresAt);
    });
  });

  inventoryItems.querySelectorAll('[data-drink]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      drinkItem(btn.getAttribute('data-drink'));
    });
  });
}

async function drinkItem(itemId) {
  try {
    const res = await authedFetch('/api/inventory-consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId })
    });
    if (!res.ok) throw new Error('Failed to consume item');
    confirmingItemId = null;
    await loadInventory();
  } catch (error) {
    confirmingItemId = null;
  }
}

function initClerk() {
  window.Clerk.load().then(() => {
    updateAuthUI();
    window.Clerk.addListener(() => updateAuthUI());
    loadInventory();
  });
}

if (window.Clerk) {
  initClerk();
} else {
  window.__clerkLoaded = initClerk;
}
