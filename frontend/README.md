# Toll Busters browser interface

This is a static HTML/CSS/JavaScript client for the local Express/MySQL API.
It implements login/logout, a dashboard, station-pass statistics with date
selection and charts, and invoice listing/payment-state updates.

## Run locally

Start the HTTPS backend and initialize the database using the [backend setup](../backend/README.md#local-setup).
The browser code in `src/utils/api.js` and page scripts uses
`https://localhost:9115/api`; changing backend `PORT` alone does not reconfigure
those URLs. Trust only your own local development certificate in the browser.

From the repository root with Python 3 available:

```bash
python3 -m http.server 3000 --bind 127.0.0.1 --directory frontend
```

Open `http://localhost:3000/`. Serving over HTTP is needed for JavaScript modules
and fetched HTML components. `package.json` currently duplicates CLI metadata
and has no `start`, `build`, or `test` script; `npm start` is not a working
frontend launch command. `src/app.js` is browser login code, not a Node server.

## Files and dependencies

- [index.html](index.html): login entry point.
- [src/views/](src/views/): dashboard, statistics, invoice, and logout pages.
- [src/js/](src/js/): page-specific API integration and rendering.
- [src/utils/api.js](src/utils/api.js): Axios calls and local token handling.
- [src/components/](src/components/): shared HTML navigation/footer fragments.
- [src/assets/](src/assets/): application presentation images. The dashboard
  image `tolls.png` is an independently drawn toll-station illustration. It
  uses the original dashboard asset path. The historical illustration was a
  press photograph published by Top Gear Greece. Access and reuse are subject
  to the source’s terms.
  [Publication reference](https://www.topgeargreece.gr/news/1005549/attiki-odos-pou-kleinei-to-bradu-tis-tetartis/)

HTML pages fetch Axios and Chart.js from jsDelivr and Font Awesome from cdnjs.
These third-party runtime resources require internet access; an offline browser
bundle is not supplied. Images already reside in the repository. No personal
Drive asset is needed for the UI.

The browser stores the session token in `localStorage`. API errors are
reported without request bodies or authorization headers. The client is
intended for a local demonstration. Browser integration and production session
isolation are outside the tested scope.
