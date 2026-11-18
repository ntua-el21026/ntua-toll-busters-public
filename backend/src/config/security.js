const secret = process.env.JWT_SECRET;
if (typeof secret !== 'string' || secret.trim().length < 32 || /^(change|replace|example)/i.test(secret)) {
    throw new Error('JWT_SECRET must be explicitly configured with at least 32 random characters');
}
module.exports = { JWT_SECRET: secret };
