# Toll Busters database

[dump.sql](dump.sql) contains the MySQL schema and coursework demonstration data
for `toll_system`: users, token blacklist, operators, toll stations, passes, and
invoices. Its header records MySQL 8.0.40. Compatibility with other database
servers has not been established.

## Initialize a disposable local database

From the repository root, use MySQL's password prompt with an account permitted
to create/import the schema:

```bash
mysql -h 127.0.0.1 -u local_admin -p -e 'CREATE DATABASE IF NOT EXISTS toll_system;'
mysql -h 127.0.0.1 -u local_admin -p toll_system < database/dump.sql
```

Replace `local_admin` with your own local account. Review the dump first: it
contains DROP statements and demonstration user records. Do not import it over
shared data. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in ignored
`backend/.env` using [backend/.env.example](../backend/.env.example). The backend
reads these values in `backend/src/config/db.js`; no source edit is required.
That module does not currently read a `DB_PORT` variable.

Environment credentials connect the application to MySQL. They do not reset
application login accounts stored in the `users` table. Replace historical demo
account passwords deliberately in a disposable instance; see the
[authentication notes](../README.md#authentication-and-local-configuration).

The [backend CSV examples](../backend/csv/) support deliberate imports and resets.
