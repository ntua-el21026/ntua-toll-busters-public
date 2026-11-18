# Synthetic reset and passage fixtures

The CSVs retained here use the shapes and lookup keys expected by the
existing controllers. They use fictional station names, routes, locations,
timestamps, and charges, with contact fields under `example.invalid`.

| Local fixture | Role in the demonstration |
|---|---|
| [tollstations2024.csv](tollstations2024.csv) | Seeds 14 synthetic stations across seven operator keys through the reset controller |
| [passes-sample.csv](passes-sample.csv) | Supplies 56 passages for the sample import, including same-operator and cross-operator cases |
| [passes59.csv](passes59.csv) and the [test copy](../../test/passes59.csv) | Supply the same 56-row second scenario to the backend and the reporting walkthrough |

The original course-associated station compilation provided the reset data.
The original sample passages exercised CSV ingestion and operator aggregation.
The earlier pair of `passes59.csv` files drove the historical team reporting
walkthrough. Source evidence did not establish redistribution terms for
the exact earlier bytes. The two current copies of the second scenario
match each other. Historical classroom results describe the earlier inputs.

An authorized course user may consult the [NTUA Software Engineering course](https://www.ece.ntua.gr/en/education/undergraduate/courses?courseId=3205)
for the exact course editions. For the historical team fixture, refer to the
preserved team submission through its authorized custodians. Exact reproduction
of the historical numerical outputs is conditional on access to those versions.
The synthetic data exercises the same input interfaces.

An offline controller check with the locked CSV parser and a database stub
accepted all 14 stations and all 56 records from each passage fixture. The
[test guide](../../test/README.md) also describes live integration with a
disposable local database.
