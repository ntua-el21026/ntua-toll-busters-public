const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword } = require('../passwords');
const { getConnection, dbConfig } = require('../config/db');

const { JWT_SECRET } = require('../config/security');

async function login(req, res) {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    try {
        let connection;
        let user;
        try {
            connection = await getConnection();
            const [results] = await connection.execute("SELECT * FROM users WHERE username = ?", [username]);
            user = results[0];
            if (!user) return res.status(401).json({ error: "Invalid credentials" });
            const result = await verifyPassword(password, user.password_hash);
            if (!result.valid) return res.status(401).json({ error: "Invalid credentials" });
            if (result.needsRehash) {
                const replacement = await hashPassword(password);
                const [updated] = await connection.execute(
                    "UPDATE users SET password_hash = ? WHERE user_id = ? AND password_hash = ?",
                    [replacement, user.user_id, user.password_hash]
                );
                if (updated.affectedRows !== 1) return res.status(401).json({ error: "Credentials changed; log in again" });
            }
        } finally {
            if (connection) connection.release();
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.user_id, username: user.username, role: user.user_role },
            JWT_SECRET,
            { expiresIn: '1h', algorithm: 'HS256' }
        );

        res.json({ token });
    } catch (err) {
        console.error("Login database operation failed");
        res.status(500).json({ error: "Database error" });
    }
}

async function logout(req, res) {
    const token = req.header("X-OBSERVATORY-AUTH"); 
    if (!token) {
        return res.status(401).json({ error: "Missing token" }); 
    }

    let connection;
    try {
        // 🔹 Verify token
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        
        // 🔹 Connect to DB
        connection = await getConnection();

        const [rows] = await connection.execute(
            "SELECT * FROM blacklisted_tokens WHERE token = ? LIMIT 1",
            [token]
        );

        if (rows.length > 0) {
            return res.status(401).json({ error: "Token is blacklisted. Please log in again." });
        }
    

        // 🔹 Save token in `blacklisted_tokens` table
        await connection.execute(
            "INSERT INTO blacklisted_tokens (token) VALUES (?)",
            [token]
        );

        res.sendStatus(200); 
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    } finally {
        if (connection) connection.release();
    }
}

// Preserve this exported middleware through the same fail-closed auth path.
async function checkBlacklist(req, res, next) {
    return require('../middleware/authMiddleware').authenticateUser(req, res, next);
}

module.exports = { login, logout, checkBlacklist };
