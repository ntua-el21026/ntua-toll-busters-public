const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../../src/passwords');

test('scrypt password verifies and rejects a different password', async () => {
 const encoded = await hashPassword('test-password');
 assert.deepEqual(await verifyPassword('test-password',encoded),{valid:true,needsRehash:false});
 assert.equal((await verifyPassword('wrong-password',encoded)).valid,false);
});

test('identical passwords receive independent salts', async () => {
 assert.notEqual(await hashPassword('test-password'),await hashPassword('test-password'));
});

test('malformed or attacker-supplied work factors fail closed', async () => {
 for(const encoded of ['', 'plaintext', 'scrypt$999999999$8$1$salt$key', 'scrypt$16384$8$1$abc$def']) {
  assert.equal((await verifyPassword('test-password',encoded)).valid,false);
 }
});
