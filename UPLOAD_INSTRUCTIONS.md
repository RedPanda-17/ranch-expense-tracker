# Ranch Expense Tracker v1.4.5 — GitHub Upload

## Replace/upload these four files in the repository root
- `index.html`
- `service-worker.js`
- `manifest.webmanifest`
- `version.json`

Do **not** delete browser site data as part of this update.

## After GitHub Pages deploys
1. Open the normal Ranch Expense Tracker URL.
2. The old page may appear briefly on the first visit while the new service worker is discovered.
3. Reload/open the app again if needed.
4. Confirm **Version 1.4.5** under Settings > About.
5. Close and reopen the app and confirm it remains on 1.4.5 without DevTools **Bypass for network**.
6. Confirm an existing test expense/receipt is still present.

## Suggested commit
`v1.4.5: fix stale service-worker cache and automatic updates`
