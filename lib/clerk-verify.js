const { verifyToken } = require('@clerk/backend');

async function requireUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    console.error('[clerk-verify] No bearer token on request');
    return null;
  }

  try {
    const result = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    return result.sub;
  } catch (error) {
    console.error('[clerk-verify] verifyToken failed:', error.message);
    return null;
  }
}

module.exports = { requireUserId };
