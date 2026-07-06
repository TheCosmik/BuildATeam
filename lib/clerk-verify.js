const { verifyToken } = require('@clerk/backend');

async function requireUserId(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const result = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });
    return result.payload.sub;
  } catch (error) {
    return null;
  }
}

module.exports = { requireUserId };
