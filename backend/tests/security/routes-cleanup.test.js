const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Transform } = require('node:stream');
const test = require('node:test');
const vm = require('node:vm');

const sources = path.resolve(__dirname, '../../src');

// Load the actual CommonJS controller or route with scoped dependency stubs.
function loadSource(relativePath, mocks) {
    const filename = path.join(sources, relativePath);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        module, exports: module.exports, __dirname: path.dirname(filename), process: { env: {} },
        console: { log() {}, warn() {}, error() {} },
        require(name) {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (name === 'fs' || name === 'path' || name === 'node:stream/promises') return require(name);
            throw new Error(`Unexpected dependency in isolated test: ${name}`);
        },
    }, { filename });
    return module.exports;
}

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function databaseCounters(execute) {
    const counts = { borrowed: 0, released: 0 };
    return {
        counts,
        config: { async getConnection() {
            counts.borrowed += 1;
            return { execute, release() { counts.released += 1; } };
        }, dbConfig: {} },
    };
}

test('passage import checks authentication and role before the staging middleware', () => {
    const posts = new Map();
    const router = { get() {}, post(route, ...handlers) { posts.set(route, handlers); } };
    const authenticateUser = () => {};
    const requireAdmin = () => {};
    const staging = () => {};
    const addPasses = () => {};
    const suppliedFiles = [];
    loadSource('routes/admin.js', {
        express: { Router: () => router },
        multer: () => ({ single(name) { suppliedFiles.push(name); return staging; } }),
        fs: { existsSync: () => true },
        '../middleware/authMiddleware': { authenticateUser, requireAdmin },
        '../controllers/adminController': { addPasses },
    });
    assert.deepEqual(suppliedFiles, ['file']);
    assert.deepEqual(posts.get('/addpasses'), [authenticateUser, requireAdmin, staging, addPasses]);
});

const reports = [
    'getTollStationPasses', 'getPassAnalysis', 'getPassesCost', 'getChargesBy', 'getAllTollStationsPasses',
];

for (const name of reports) {
    test(`${name} validates both dates before borrowing a connection`, async () => {
        const { counts, config } = databaseCounters(async () => { throw new Error('unexpected query'); });
        const controller = loadSource('controllers/coreController.js', { '../config/db': config });
        for (const dates of [
            { date_from: 'invalid', date_to: '20220102' },
            { date_from: '20220101', date_to: 'invalid' },
        ]) {
            const res = response();
            await controller[name]({ params: dates, query: dates }, res);
            assert.equal(res.statusCode, 400);
        }
        assert.deepEqual(counts, { borrowed: 0, released: 0 });
    });

    test(`${name} releases one connection when the query fails`, async () => {
        const { counts, config } = databaseCounters(async () => { throw new Error('synthetic driver details'); });
        const controller = loadSource('controllers/coreController.js', { '../config/db': config });
        const dates = { date_from: '20220101', date_to: '20220102' };
        const res = response();
        await controller[name]({ params: dates, query: dates }, res);
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.info, 'Internal server error');
        assert.deepEqual(counts, { borrowed: 1, released: 1 });
    });
}

test('recognized reports release the query connection before sending their JSON response', async () => {
    const { counts, config } = databaseCounters(async () => [[{ nPasses: 4, passesCost: 10 }]]);
    const core = loadSource('controllers/coreController.js', { '../config/db': config });
    const res = response();
    res.json = (body) => {
        assert.equal(counts.released, 1);
        assert.equal(body.nPasses, 4);
    };
    await core.getPassesCost({ params: { date_from: '20220101', date_to: '20220102' }, query: {} }, res);
    assert.deepEqual(counts, { borrowed: 1, released: 1 });
});

function adminWith(config, parser) {
    return loadSource('controllers/adminController.js', {
        '../config/db': config,
        '../passwords': { hashPassword() { throw new Error('not used in this test'); } },
        'csv-parser': parser,
    });
}

test('reset deletes dependent rows first, preserves checks and releases once after failure', async () => {
    const commands = [];
    const { counts, config } = databaseCounters(async (command) => {
        commands.push(command);
        if (command === 'DELETE FROM invoices') throw new Error('synthetic SQL driver detail');
    });
    const admin = adminWith(config);
    const res = response();
    await admin.resetPasses({}, res);
    assert.deepEqual(commands, ['DELETE FROM passes', 'DELETE FROM invoices']);
    assert.deepEqual(counts, { borrowed: 1, released: 1 });
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.info, 'Pass reset failed');
});

function stagedFixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toll-upload-tests-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'upload');
    fs.writeFileSync(file, 'synthetic parser input');
    return file;
}

function passRow() {
    return new Transform({
        readableObjectMode: true,
        transform(_chunk, _encoding, done) {
            done(null, { timestamp: '2022-01-01', tollID: 'DEMO-STATION', tagHomeID: 'DEMO-OP', charge: '1.25' });
        },
    });
}

test('staged files are removed when database acquisition fails', async (t) => {
    const file = stagedFixture(t);
    const config = { async getConnection() { throw new Error('synthetic acquisition failure'); } };
    const res = response();
    await adminWith(config, passRow).addPasses({ file: { path: file } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.info, 'Pass import failed');
    assert.equal(fs.existsSync(file), false);
});

test('staged files are removed on parser errors and no connection is borrowed', async (t) => {
    const file = stagedFixture(t);
    const { counts, config } = databaseCounters(async () => { throw new Error('unexpected query'); });
    function parserError() {
        return new Transform({
            transform(_chunk, _encoding, done) { done(new Error('synthetic CSV parser error')); },
        });
    }
    const res = response();
    await adminWith(config, parserError).addPasses({ file: { path: file } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(fs.existsSync(file), false);
    assert.deepEqual(counts, { borrowed: 0, released: 0 });
});

test('staged files and the connection are cleaned up after an invoice query failure', async (t) => {
    const file = stagedFixture(t);
    const { counts, config } = databaseCounters(async (sql) => {
        if (sql.includes('INSERT IGNORE INTO passes')) return [{ affectedRows: 1, insertId: 1 }];
        throw new Error('synthetic billing query failure');
    });
    const res = response();
    await adminWith(config, passRow).addPasses({ file: { path: file } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.info, 'Pass import failed');
    assert.equal(fs.existsSync(file), false);
    assert.deepEqual(counts, { borrowed: 1, released: 1 });
});

test('a missing invoice still releases the connection exactly once', async () => {
    const { counts, config } = databaseCounters(async () => [[]]);
    const controller = loadSource('controllers/invoiceController.js', { '../config/db': config });
    const res = response();
    await controller.payInvoice({
        user: { username: 'A_operator' },
        body: { issuing_op_id: 'A', receiving_op_id: 'B' },
    }, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(counts, { borrowed: 1, released: 1 });
});

test('invoice database failures release the connection and return a generic response', async () => {
    const { counts, config } = databaseCounters(async () => { throw new Error('synthetic driver details'); });
    const controller = loadSource('controllers/invoiceController.js', { '../config/db': config });
    const res = response();
    await controller.createInvoices({ user: { username: 'A_operator' } }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Internal Server Error');
    assert.deepEqual(counts, { borrowed: 1, released: 1 });
});
