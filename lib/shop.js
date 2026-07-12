// Central item catalog. Each item is a consumable: buying adds one to the
// player's inventory, and drinking/using it (from the Inventory tab) grants
// a temporary training-speed boost.
const SHOP_ITEMS = [
  {
    id: 'qb_xp_boost',
    name: 'QB XP Boost',
    description: 'Energy drink. Grants +5% training speed for 1 hour when consumed.',
    price: 5,
    image: 'qb-xp-boost.png',
    boostPercent: 5,
    boostDurationSeconds: 3600
  }
];

function getItem(id) {
  return SHOP_ITEMS.find((item) => item.id === id);
}

module.exports = { SHOP_ITEMS, getItem };
