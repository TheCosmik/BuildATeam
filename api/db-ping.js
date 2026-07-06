const { sql } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    const rows = await sql`SELECT 1 as ok`;
    res.status(200).json({ rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
