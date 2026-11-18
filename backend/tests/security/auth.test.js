const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'offline-test-key-'.repeat(4);
process.env.JWT_SECRET = TEST_SECRET;
const dbPath = require.resolve('../../src/config/db');
let connectionFactory;
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: { getConnection: () => connectionFactory(), dbConfig: {} } };
const middleware = require('../../src/middleware/authMiddleware');
const controller = require('../../src/controllers/authController');
const admin = require('../../src/controllers/adminController');
function response() {
  return { code: 200, body: null, status(n) { this.code = n; return this; },
    json(body) { this.body = body; return this; }, sendStatus(n) { this.code = n; return this; } };
}
function request(token) { return { header: () => token }; }

test('startup rejects a missing signing secret', () => {
  const env = { ...process.env }; delete env.JWT_SECRET;
  const child = spawnSync(process.execPath, ['-e', "require('./src/middleware/authMiddleware')"], { cwd: process.cwd(), env, encoding: 'utf8' });
  assert.notEqual(child.status, 0, 'missing JWT_SECRET must fail startup');
  assert.match(child.stderr, /JWT_SECRET/);
});

test('blacklist outage denies authentication', async () => {
  connectionFactory = async () => { throw new Error('offline blacklist unavailable'); };
  const token = jwt.sign({ username: 'demo' }, TEST_SECRET);
  let called = false; const res = response();
  await middleware.authenticateUser(request(token), res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.code, 503);
});

test('blacklist lookup releases a successful connection', async () => {
  let releases = 0;
  connectionFactory = async () => ({ execute: async () => [[]], release: () => { releases++; } });
  const res = response(); let called = false;
  await middleware.authenticateUser(request(jwt.sign({ username: 'demo' }, TEST_SECRET)), res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(releases, 1);
});

test('new passwords use salted scrypt rather than a fast digest', async () => {
  const written = [];
  connectionFactory = async () => ({
    execute: async (sql, args) => { if (sql.startsWith('SELECT')) return [[]]; written.push(args); return [{}]; }, release() {} });
  const res = response();
  await admin.userMod({ body: { username: 'demo', passw: 'test-password' } }, res);
  assert.equal(res.code, 200);
  assert.match(written[0][1], /^scrypt\$16384\$8\$1\$/);
});

test('legacy verified login upgrades stored hash before issuing a token', async () => {
  const legacy = crypto.createHash('sha256').update('test-password').digest('hex');
  const updates = [];
  connectionFactory = async () => ({ execute: async (sql, args) => {
    if (sql.startsWith('SELECT')) return [[{ user_id: 7, username: 'demo', password_hash: legacy }]];
    updates.push(args); return [{ affectedRows: 1 }];
  }, release() {} });
  const res = response();
  await controller.login({ body: { username: 'demo', password: 'test-password' } }, res);
  assert.equal(res.code, 200);
  assert.equal(updates.length, 1);
  assert.match(updates[0][0], /^scrypt\$/);
  assert.equal(jwt.verify(res.body.token, TEST_SECRET).id, 7);
});

test('wrong legacy password never writes a migration', async () => {
  let writes = 0;
  connectionFactory = async () => ({ execute: async (sql) => {
    if (sql.startsWith('SELECT')) return [[{ user_id: 7, username: 'demo', password_hash: crypto.createHash('sha256').update('right').digest('hex') }]];
    writes++; return [{}];
  }, release() {} });
  const res = response();
  await controller.login({ body: { username: 'demo', password: 'wrong' } }, res);
  assert.equal(res.code, 401); assert.equal(writes, 0);
});

test('admin username cannot substitute for an admin role', () => {
 const res=response();let called=false;
 middleware.requireAdmin({user:{username:'admin',role:'operator'}},res,()=>{called=true;});
 assert.equal(called,false);assert.equal(res.code,403);
});

test('a database admin role permits administration', () => {
 const res=response();let called=false;
 middleware.requireAdmin({user:{username:'demo-admin',role:'admin'}},res,()=>{called=true;});
 assert.equal(called,true);
});
