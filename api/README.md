# Toll Busters API contracts

The [team Postman collection](Toll%20System%20API.postman_collection.json)
documents 13 project requests. The [Express route source](../backend/src/routes/)
defines the implemented interface.

The omitted 2024–2025 OpenAPI document defined the prescribed endpoints,
request and response shapes, and reporting parameters. The omitted team
grading collection exercised the course contract for assessment. Authorized
students can look for those exact editions through the
[NTUA Software Engineering course](https://www.ece.ntua.gr/en/education/undergraduate/courses?courseId=3205).
The project collection, route map below, and
[synthetic scenarios](../backend/csv/README.md) support local inspection.
Reproducing the historical grader run depends on the original course
collection and its inputs.

The local base URL is `https://localhost:9115/api`. Authenticate through
`POST /login`, then send the token in `X-OBSERVATORY-AUTH`; `POST /logout`
revokes it. Never reuse historical collection tokens or shared account values.

| API family | Implemented routes after `/api` |
|---|---|
| Station passages | `GET /tollStationPasses/:tollStationID/:date_from/:date_to` |
| Cross-operator reports | `GET /passAnalysis/:stationOpID/:tagOpID/:date_from/:date_to`, `GET /passesCost/:tollOpID/:tagOpID/:date_from/:date_to` |
| Charges | `GET /chargesBy/:tollOpID/:date_from/:date_to` |
| All-station statistics | `GET /tollstations?date_from=...&date_to=...` |
| Invoices | `GET /invoice/generate`, `POST /invoice/pay` |
| Administration | `/admin/healthcheck`, `/admin/resetpasses`, `/admin/resetstations`, `/admin/usermod`, `/admin/users`, `/admin/addpasses` |

Report dates use `YYYYMMDD`. The four dated reports in the station passes,
cross-operator and charges rows support CSV through `?format=csv`. The
all-station statistics route returns JSON. `GET /invoice/generate` lists
invoices. Passage imports can create or update invoices, and payment records
a database status change. For route authorization and upload handling, see the
[backend guide](../backend/README.md#core-report-connection-lifecycle).

Import collections into Postman only for a disposable local stack. Set
`localOperatorPassword` and `localAdminPassword` privately in your Postman
environment and review mutating requests before executing.
