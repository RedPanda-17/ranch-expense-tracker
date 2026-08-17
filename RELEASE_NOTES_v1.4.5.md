# Ranch Expense Tracker v1.4.5 — Automatic Update & Cache Reliability Update

## Problem fixed
GitHub Pages could successfully deploy a new `index.html`, but an older service worker could continue serving its previously cached copy. Users could see the new version only while Chrome DevTools **Bypass for network** was enabled, then revert to the old version after disabling it.

## Changes
- Added a versioned Ranch Expense Tracker service-worker cache.
- Changed page navigation to **network first** while online.
- The cached `index.html` is now used as an **offline fallback**, not as the preferred online response.
- Added `self.skipWaiting()` and `clients.claim()` so a newly deployed worker can activate promptly.
- Added explicit service-worker update checks on app startup.
- Registration now uses `updateViaCache: "none"` so service-worker update checks do not rely on the browser HTTP cache.
- The page reloads once after a newly activated worker takes control.
- The service worker does **not** clear localStorage or IndexedDB.
- Existing production data identifiers remain unchanged.
- Old caches created by this new versioned cache system are pruned safely; unrelated origin caches are not deleted.
- Added/updated `manifest.webmanifest` and `version.json` for hosted deployment.
- All v1.4.4 receipt zoom, adaptive PDF compression, download-first file handling, and receipt optimization changes remain included.

## First upgrade from the old worker
The currently installed old worker may serve the old page once while the browser discovers the new `service-worker.js`. Once v1.4.5's worker installs and activates, a reload should move the app to the new network-first update behavior. Existing expense and receipt data should remain intact.

## Files that must be uploaded/replaced in the repository root
1. `index.html`
2. `service-worker.js`
3. `manifest.webmanifest`
4. `version.json`

The other files in the package are archive/documentation copies and do not need to replace unrelated repository files.

## Suggested GitHub commit
`v1.4.5: fix stale service-worker cache and automatic updates`
