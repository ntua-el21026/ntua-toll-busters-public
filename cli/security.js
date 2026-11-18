const fs = require('node:fs');
const https = require('node:https');
const { randomUUID } = require('node:crypto');

function createApiClient(axios, address, caFile) {
    const url = new URL(address);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new Error('BASE_URL must be an HTTPS base URL without credentials, query or fragment.');
    }
    const tls = { rejectUnauthorized: true };
    if (caFile) tls.ca = fs.readFileSync(caFile);
    return axios.create({
        baseURL: url.href.replace(/\/$/, ''),
        httpsAgent: new https.Agent(tls),
        // Keep the authorization header confined to the configured endpoint.
        maxRedirects: 0,
        proxy: false,
    });
}

function readToken(tokenPath) {
    const { O_NONBLOCK, O_NOFOLLOW, O_RDONLY } = fs.constants;
    const fd = fs.openSync(tokenPath, O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1 ||
            (process.getuid && stat.uid !== process.getuid())) {
            throw new Error('The token file must be a private regular file.');
        }
        // Repair permissions on files created by earlier versions before use.
        if ((stat.mode & 0o777) !== 0o600) fs.fchmodSync(fd, 0o600);
        const token = fs.readFileSync(fd, 'utf8').trim();
        if (!token) throw new Error('The token file is empty.');
        return token;
    } finally {
        fs.closeSync(fd);
    }
}

function writeToken(tokenPath, token) {
    if (typeof token !== 'string' || !token.trim()) throw new Error('Invalid token response.');
    const stagedPath = `${tokenPath}.${randomUUID()}.tmp`;
    const fd = fs.openSync(stagedPath, 'wx', 0o600);
    try {
        try {
            fs.fchmodSync(fd, 0o600);
            fs.writeFileSync(fd, token, 'utf8');
        } finally {
            fs.closeSync(fd);
        }
        fs.renameSync(stagedPath, tokenPath);
    } finally {
        fs.rmSync(stagedPath, { force: true });
    }
}

function requestFailure(error) {
    const status = error?.response?.status;
    if (Number.isInteger(status) && status >= 300 && status <= 599) return `HTTP ${status}.`;
    switch (error?.code) {
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
            return 'The certificate does not match the API hostname.';
        case 'CERT_HAS_EXPIRED':
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
        case 'SELF_SIGNED_CERT_IN_CHAIN':
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
        case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
            return 'The API certificate could not be verified.';
        default:
            return 'Request could not be completed. Check the HTTPS URL, local CA and service.';
    }
}

module.exports = { createApiClient, readToken, writeToken, requestFailure };
