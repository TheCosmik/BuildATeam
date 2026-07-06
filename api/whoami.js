const { requireUserId } = require('../lib/clerk-verify');

module.exports = async function handler(req, res) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    res.status(200).json({ userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
