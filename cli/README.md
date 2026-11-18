# Toll Busters CLI

[se2459.js](se2459.js) is the Node/Commander client for the Express API.
Use the [backend setup](../backend/README.md#local-setup) first. Install the locked CLI dependencies
with `npm --prefix cli ci --ignore-scripts` from the root; no global `npm link`
is required.

```bash
node cli/se2459.js --help
node cli/se2459.js login --help
```

## HTTPS and session files

The default API address is `https://localhost:9115/api`. Set `BASE_URL` to
override it with another HTTPS base URL. The CLI verifies certificates and
hostnames and sends requests directly to the configured endpoint without
following redirects. For the self-signed development certificate created by
the backend guide, trust that certificate explicitly. From the repository root:

```bash
export TOLL_API_CA_FILE="$PWD/backend/ssl/server.crt"
```

The certificate must match the hostname in the URL. Login writes the session
token to the ignored plaintext file `cli/.token` with mode `0600` on Linux
and WSL. Later requests send it in `X-OBSERVATORY-AUTH`. Successful logout
revokes the session token and deletes the file. CLI diagnostics omit
authorization headers, request bodies and raw errors from the server. The
`--passw` option still puts the password in process arguments, so use
disposable local demonstration credentials.

## Commands

Commands below are appended to `node cli/se2459.js`. `--from` and `--to` use
`YYYYMMDD`; IDs must exist in your imported data.

| Command | Options / behavior |
|---|---|
| `login` | `--username <name> --passw <demo-password>` |
| `logout` | Revoke the token and remove the local token file |
| `healthcheck` | Authenticated administrative health request |
| `resetpasses`, `resetstations` | Administrative data resets; mutate local data |
| `admin --users` | List users as administrator |
| `admin --usermod` | `--username <name> --passw <demo-password>`; create/update a user |
| `admin --addpasses` | `--source csv/passes-sample.csv`; upload passes |
| `tollstationpasses` | `--station <id> --from <date> --to <date> [--format json\|csv]` |
| `passanalysis`, `passescost` | `--stationop <id> --tagop <id> --from <date> --to <date> [--format json\|csv]` |
| `chargesby` | `--opid <id> --from <date> --to <date> [--format json\|csv]` |
| `generateinvoices` | List invoices using the implemented API route |
| `payinvoice` | `--issuing_op_id <issuer> --receiving_op_id <receiver>`; record local paid status |

Relative CSV source paths resolve from `backend/`. The example above loads
`backend/csv/passes-sample.csv`.
Authorization is enforced by backend routes/controllers. Consult
[API artifacts](../api/README.md) and the [test guide](../test/README.md) before
administrative or integration runs.
