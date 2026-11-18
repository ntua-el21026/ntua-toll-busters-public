const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const N = 16384, r = 8, p = 1, keyLength = 64;

async function hashPassword(password) {
    if (typeof password !== 'string' || !password) throw new TypeError('Password must be a nonempty string');
    const salt = crypto.randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, keyLength, { N, r, p });
    return `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
    if (typeof password !== 'string' || !password || typeof stored !== 'string') return { valid: false, needsRehash: false };
    if (/^[a-f0-9]{64}$/i.test(stored)) {
        const actual = crypto.createHash('sha256').update(password).digest();
        return { valid: crypto.timingSafeEqual(actual, Buffer.from(stored, 'hex')), needsRehash: true };
    }
    // Fixed parameters and exact encoded sizes also bound verification work.
    const match = /^scrypt\$16384\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);
    if (!match) return { valid: false, needsRehash: false };
    const actual = await scrypt(password, match[1], keyLength, { N, r, p });
    return { valid: crypto.timingSafeEqual(actual, Buffer.from(match[2], 'hex')), needsRehash: false };
}
module.exports = { hashPassword, verifyPassword };
