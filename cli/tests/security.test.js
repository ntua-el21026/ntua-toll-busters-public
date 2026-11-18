const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiClient, readToken, writeToken, requestFailure } = require('../security');

const configOnly = { create: (config) => config };

function temporaryDirectory(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toll-cli-security-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

test('TLS config is endpoint-scoped and refuses HTTP, URL credentials and redirects', () => {
    const config = createApiClient(configOnly, 'https://localhost:9115/api/');
    assert.equal(config.baseURL, 'https://localhost:9115/api');
    assert.equal(config.httpsAgent.options.rejectUnauthorized, true);
    assert.equal(config.maxRedirects, 0);
    assert.equal(config.proxy, false);
    for (const url of ['http://localhost/api', 'https://demo@localhost/api', 'https://localhost/api?x=1',
        'https://localhost/api#fragment']) {
        assert.throws(() => createApiClient(configOnly, url), /BASE_URL/);
    }
    config.httpsAgent.destroy();
});

const openssl = spawnSync('openssl', ['version'], { stdio: 'ignore' }).status === 0;

test('loopback TLS rejects untrusted certificates and hostname mismatch', { skip: !openssl }, async (t) => {
    const directory = temporaryDirectory(t);
    const key = path.join(directory, 'key.pem');
    const certificate = path.join(directory, 'cert.pem');
    const generated = spawnSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
        '-keyout', key, '-out', certificate, '-subj', '/CN=localhost',
        '-addext', 'subjectAltName=DNS:localhost',
    ], { stdio: 'ignore' });
    assert.equal(generated.status, 0);

    const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(certificate) },
        (_request, response) => response.end('local fixture'));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();
    const untrusted = createApiClient(configOnly, `https://localhost:${port}/api`);
    const trusted = createApiClient(configOnly, `https://localhost:${port}/api`, certificate);
    t.after(() => {
        untrusted.httpsAgent.destroy();
        trusted.httpsAgent.destroy();
        return new Promise((resolve) => server.close(resolve));
    });

    function status(agent, servername) {
        return new Promise((resolve, reject) => {
            https.get({ host: '127.0.0.1', port, servername, agent }, (response) => {
                response.resume();
                resolve(response.statusCode);
            }).on('error', reject);
        });
    }

    await assert.rejects(status(untrusted.httpsAgent, 'localhost'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' });
    assert.equal(await status(trusted.httpsAgent, 'localhost'), 200);
    await assert.rejects(status(trusted.httpsAgent, 'mismatch.invalid'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
});

test('request diagnostics omit raw response data and client request contents', () => {
    const sensitive = 'synthetic-marker-for-omitted-fields';
    const error = {
        message: sensitive,
        response: { status: 401, data: { detail: sensitive } },
        config: { headers: { 'X-OBSERVATORY-AUTH': sensitive }, data: sensitive },
    };
    assert.equal(requestFailure(error), 'HTTP 401.');
    assert.doesNotMatch(requestFailure({ message: sensitive, code: sensitive }), new RegExp(sensitive));
    assert.equal(requestFailure({ code: 'ERR_TLS_CERT_ALTNAME_INVALID', message: sensitive }),
        'The certificate does not match the API hostname.');
});

test('token writes atomically replace previous bytes and restrict existing permissions',
    { skip: process.platform === 'win32' }, (t) => {
        const directory = temporaryDirectory(t);
        const file = path.join(directory, '.token');
        fs.writeFileSync(file, 'first-fixture');
        fs.chmodSync(file, 0o644);
        assert.equal(readToken(file), 'first-fixture');
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
        fs.chmodSync(file, 0o644);
        writeToken(file, 'second-fixture');
        assert.equal(readToken(file), 'second-fixture');
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
        assert.deepEqual(fs.readdirSync(directory), ['.token']);
    });

test('POSIX token path refuses symlink reads and never writes through an existing link',
    { skip: process.platform === 'win32' }, (t) => {
        const directory = temporaryDirectory(t);
        const file = path.join(directory, '.token');
        const unrelated = path.join(directory, 'unrelated');
        fs.writeFileSync(unrelated, 'keep-unchanged');
        fs.symlinkSync(unrelated, file);
        assert.throws(() => readToken(file), { code: 'ELOOP' });
        writeToken(file, 'local-fixture');
        assert.equal(readToken(file), 'local-fixture');
        assert.equal(fs.readFileSync(unrelated, 'utf8'), 'keep-unchanged');
    });

test('the CLI request path uses the scoped client and prints only a safe failure', async (t) => {
    const vm = require('node:vm');
    const directory = temporaryDirectory(t);
    const tokenPath = path.join(directory, '.token');
    const marker = 'synthetic-token-marker';
    writeToken(tokenPath, marker);
    const recorded = [];
    const output = [];
    const actions = new Map();
    let command;
    let commandError;
    let completed;
    const program = {
        configureOutput({ outputError }) { commandError = outputError; return this; },
        command(name) { command = name; return this; },
        description() { return this; },
        option() { return this; },
        requiredOption() { return this; },
        action(handler) { actions.set(command, handler); return this; },
        parseAsync() { completed = actions.get('healthcheck')(); return completed; },
    };
    const scopedProcess = { argv: [], env: {}, exit() { this.exitCode = 1; } };
    const file = path.resolve(__dirname, '../se2459.js');
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        __dirname: directory,
        process: scopedProcess,
        console: { log(...args) { output.push(args.join(' ')); }, error(...args) { output.push(args.join(' ')); } },
        require(name) {
            if (name === 'commander') return { program };
            if (name === 'dotenv') return { config() {} };
            if (name === 'form-data') return undefined;
            if (name === './security') return require('../security');
            if (name === 'axios') return { create(config) {
                config.httpsAgent.destroy();
                return { async request(data) {
                    recorded.push({ config, data });
                    throw { response: { status: 401, data: { bearer: marker } }, message: marker };
                } };
            } };
            return require(name);
        },
    }, { filename: file });
    await completed;
    const [{ config, data }] = recorded;
    assert.equal(config.httpsAgent.options.rejectUnauthorized, true);
    assert.equal(data.url, '/admin/healthcheck');
    assert.equal(data.headers['X-OBSERVATORY-AUTH'], marker);
    assert.equal(scopedProcess.exitCode, 1);
    commandError(`error: unknown command '${marker}'`, (message) => output.push(message));
    assert.match(output.join('\n'), /HTTP 401/);
    assert.match(output.join('\n'), /error: unknown command/);
    assert.doesNotMatch(output.join('\n'), new RegExp(marker));
});

test('browser API failures exclude submitted data and custom headers', async (t) => {
    const marker = 'synthetic-browser-diagnostic-marker';
    let failureHandler;
    const api = {
        interceptors: { response: { use(_success, fail) { failureHandler = fail; } } },
        async post() {
            return failureHandler({
                response: { status: 401, data: { detail: marker } },
                config: { data: marker, headers: { 'X-OBSERVATORY-AUTH': marker } },
            });
        },
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { axios: { create: () => api } } });
    t.after(() => {
        if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
        else delete globalThis.window;
    });
    const filename = path.resolve(__dirname, '../../frontend/src/utils/api.js');
    const source = fs.readFileSync(filename, 'utf8');
    const { login } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    await assert.rejects(login('synthetic-user', marker), (error) => {
        assert.equal(error.message, 'API request failed (HTTP 401).');
        assert.doesNotMatch(String(error.stack), new RegExp(marker));
        return true;
    });
});
