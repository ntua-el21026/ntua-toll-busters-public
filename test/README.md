# Toll Busters validation

## Current offline verification

From the repository root, run the dependency-free suite with Node and
OpenSSL:

```bash
node --test cli/tests/security.test.js backend/tests/security/routes-cleanup.test.js backend/tests/security/passwords.test.js
```

On 18 November 2026, all 28 tests passed with Node v24.20.0. A loopback HTTPS
fixture tested rejection of an untrusted certificate and a hostname mismatch,
and accepted a hostname-matching certificate when explicitly trusted. Mocks
covered CLI and browser error output, authorization before upload staging,
report and invoice connection release, and cleanup of temporary uploads.

A separate offline check used the locked `csv-parser` 3.1.0 and a database
stub. It accepted all 14 synthetic stations across seven operator keys and all
56 passages in each scenario. Live MySQL, full CLI, invoice and browser
workflows require separate integration checks.

## Historical offline security evidence

The earlier full security run recorded eleven passing tests. With the locked
backend dependencies installed, the root `npm test` delegates to the backend’s
`test:security` script. It covers signing configuration, failures on the
authentication path, connection release in those paths, scrypt, legacy
migration, and database-issued administrative roles. The latest 28-test
run covers the dependency-free and mocked paths above.

## Opt-in integration suites

[cli.test.js](cli.test.js) contains nine Mocha CLI integration cases. They log in
as the local `admin`, reset/import data, create a token file, and remove it during
cleanup. Start a disposable API/database using the [backend guide](../backend/README.md#local-setup),
then install root development dependencies with `npm ci --ignore-scripts`.
Set `TOLL_TEST_ADMIN_PASSWORD` privately to the local demo account password.
The suite runs only with `RUN_INTEGRATION=1`:

```bash
export TOLL_API_CA_FILE="$PWD/backend/ssl/server.crt"
RUN_INTEGRATION=1 npm run test:integration
```

Without the flag, Mocha skips the suite. Do not confuse this command with the
root offline `npm test`. The healthcheck content assertions use the [synthetic inputs](../backend/csv/README.md)
with 14 seeded stations and 56 sample passages. The healthcheck assertion also expects the historical connection descriptor
`mysql://root@localhost/toll_system`.

[59.sh](59.sh) is a separate historical shell client. Review its commands,
paths, and credential assumptions before any use; it is not a safe default test
runner. Both integration suites and the Postman collections can mutate data.
