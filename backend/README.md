# Toll Busters backend

The Express HTTPS service uses MySQL for users, tokens, operators, stations,
passages, and invoices. See the [route source](src/routes/),
[controllers](src/controllers/), [auth middleware](src/middleware/authMiddleware.js),
and [password helpers](src/passwords.js).

## Local setup

From the repository root, install the locked backend and CLI dependencies and
create a private configuration. Use Node/npm, OpenSSL, and a disposable local
MySQL database. See the [database guide](../database/README.md) for schema
import and demonstration-account assumptions.

```bash
npm --prefix backend ci --ignore-scripts
npm --prefix cli ci --ignore-scripts
cp backend/.env.example backend/.env
```

Set a private database account and password and a random `JWT_SECRET` of at
least 32 characters in ignored `backend/.env`. For example, generate it
locally with `openssl rand -hex 32`. Use MySQL's password prompt for schema
import. Environment edits leave accounts already stored in the database
unchanged.

Generate a development certificate from `backend/`:

```bash
cd backend
mkdir -p ssl
openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
  -keyout ssl/server.key -out ssl/server.crt \
  -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
npm start
```

The listener binds `127.0.0.1:9115`. Certificate paths resolve relative to the
application source. The private configuration, development keys and uploads
are local artifacts. The browser and CLI each require explicit trust for a
self-signed certificate. [CLI TLS setup](../cli/README.md#https-and-session-files)

## Authentication and local configuration

Signing configuration is mandatory. JWT verification is restricted to HS256.
Blacklist lookup failures return 503. Administration requires the role
stored in the database. The login, logout, and blacklist validation paths
release their borrowed connections.

Passwords use the format `scrypt$16384$8$1$<salt hex>$<key hex>`, with a
16-byte salt and a 64-byte key. A verified legacy SHA-256 password is migrated
with a conditional update. Failed migration and wrong-password checks prevent
token issuance.

The optional `ADMIN_BOOTSTRAP_PASSWORD` can create a missing local admin
during an intentional `resetpasses` operation. This operation leaves an
existing administrator account in place. Reset historical demonstration
passwords explicitly in the disposable database.

## Verification

The [test guide](../test/README.md) separates the offline password, TLS and
controller checks from opt-in integration. The bounded controller tests use
in-memory database stubs. Full administration, import and invoice workflows
require live verification with a disposable MySQL instance.

## Core report connection lifecycle

The five [report handlers](src/controllers/coreController.js) validate both
date fields before borrowing a connection and return it to the pool after
the query, including on failure. Administrative and invoice handlers release
a borrowed connection once per request. Reset operations delete dependent rows
before parent rows with foreign-key checks enabled.

The passage-upload route checks authentication and the administrator role
before staging a file on disk. The import controller removes the staged file
on return or error. Uploads, resets and invoice updates change database
records. Use them only with disposable demonstration data.
