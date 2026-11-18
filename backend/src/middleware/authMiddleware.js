const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db');
const { JWT_SECRET } = require('../config/security');

async function authenticateUser(req, res, next) {
    const token = req.header('X-OBSERVATORY-AUTH');
    if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
        if (rows.length) return res.status(401).json({ error: 'Unauthorized: Token is blacklisted' });
    } catch {
        return res.status(503).json({ error: 'Authentication temporarily unavailable' });
    } finally {
        if (connection) connection.release();
    }
    req.user = decoded;
    return next();
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin access required' });
    next();
}
module.exports = { authenticateUser, requireAdmin };
