# Toll Busters

Toll Busters is a team project for the 2024–2025 Software Engineering course at NTUA ECE. It demonstrates how a shared toll-reporting system ingests passage records, aggregates charges between operators, and exposes the same workflows through an HTTPS API, a command-line client, and a browser interface.

## Engineering contribution

- The [Express backend](backend/README.md) implements authentication, station passage queries, cross-operator analysis, charge totals, CSV ingestion, and invoice status updates. The [MySQL schema](database/README.md) models operators, stations, passages, users, revoked tokens, and invoices.
- The [Node CLI](cli/README.md) and [browser interface](frontend/README.md) use the same API. The browser presents a dashboard, dated station statistics, and invoice views. Payment in this prototype records a status in MySQL.
- The [team Postman collection and route map](api/README.md), [SRS and model](doc/README.md), and [AI-assisted development record](ailog/README.md) document the interfaces, design decisions, and team workflow.

## Data and source materials

The original NTUA OpenAPI specification described the course contract. The grading collection exercised that contract for assessment. Consult the [API guide](api/README.md) for authorized access and for the retained project-authored requests and implementation routes.

The [synthetic fixtures](backend/csv/README.md) include a 14-station list and two scenarios with 56 passages each. They exercise reset, import, and reporting. The coursework reports and recorded results use the original inputs. The dashboard uses a project-authored toll-station illustration. [Frontend asset provenance](frontend/README.md)

## Validation and limits

On Node v24.20.0, 28 offline tests passed, including certificate and hostname checks on loopback, token-file protection, and connection and upload cleanup with mocks. A separate check with the locked CSV parser and a database stub accepted all 14 synthetic stations and all 56 passages in each scenario. Live MySQL, browser and full CLI integration require separate verification. [Test evidence and commands](test/README.md)

### Known runtime limitations

Use the coursework prototype with a disposable database and demonstration accounts on loopback. The CLI verifies HTTPS certificates and hostnames and accepts an explicit development CA. The browser uses a fixed local API URL and stores its session token in `localStorage`. [CLI TLS setup](cli/README.md#https-and-session-files) · [Backend connection lifecycle](backend/README.md#core-report-connection-lifecycle)

## Local reproduction

Follow the [backend setup](backend/README.md#local-setup) for the locked Node dependencies, disposable MySQL schema, and development certificates. Use the [CLI guide](cli/README.md) for command examples or the [browser guide](frontend/README.md) to serve the static client. The browser requires internet access to its listed CDN resources. The [integration test guide](test/README.md#opt-in-integration-suites) identifies tests that reset or write database records.

### Authentication and local configuration

The local API requires explicit database credentials and a JWT signing secret. Review the [backend authentication configuration](backend/README.md#authentication-and-local-configuration) and [database setup](database/README.md) before using the demonstration accounts.

## Team and licensing

The work is credited to **Team SoftEng24-59**, including **Michail Athanasios Peppas**. The [MIT notice](LICENSE) applies to original contributions within its scope. Course materials and third-party dependencies have separate terms. The synthetic fixtures and independently drawn dashboard illustration are authored project material.
