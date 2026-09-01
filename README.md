# Ranch Expense Tracker

Current release: **Version 1.5.0 — PDF Accounting Review Update**

Live app: https://redpanda-17.github.io/ranch-expense-tracker/

## Purpose
Ranch Expense Tracker is a local-first personal business expense and mileage tracker. Employees can capture receipts, organize expenses, build reimbursement reports, and download PDF/CSV files without sending expense records to a central application database.

Version 1.5.0 adds PDF-only Accounting Review assistance, including receipt OCR checks for possible amount/date mismatches, tips over 20%, duplicate expenses, and selected potentially non-reimbursable items. These warnings are advisory; the attached receipt remains the source Accounting should verify.

## Current application files
- `index.html` — self-contained live application (HTML, CSS, and JavaScript)
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline shell and update handling
- `icon-192.png` / `icon-512.png` — installed-app icons
- `version.json` — release metadata

## Data storage
- Expenses, reports, settings, and the current report draft use browser `localStorage`.
- Receipt and route-document files use IndexedDB.
- The service worker caches the application shell for offline fallback.
- Backups package the local records and supporting documents into a `.ranchbackup` file.

Keep using the same website address, browser, and browser profile to preserve the same local data store. Download backups regularly, especially before changing devices, clearing site data, or uninstalling an installed web app.

## Receipt OCR
Receipt recognition runs in the browser when Accounting Review is needed for an image receipt. The OCR library/language resources are loaded on demand, so automatic receipt reading requires internet access when those resources are not already available.

## Documentation
- `USER_GUIDE.md` — employee workflow
- `WEB_APP_INSTALLATION_GUIDE.md` — browser/PWA installation
- `TECHNICAL_HANDOFF.md` — architecture and limitations
- `RELEASE_NOTES.md` — current release
- `CHANGELOG.md` — release history

Historical standalone builds and superseded repository artifacts were preserved before the Version 1.5.0 cleanup on branch `archive-pre-1.5-cleanup-2026-09-01`.

## Use notice
See `COPYRIGHT.md` and `INTERNAL_USE_NOTICE.txt` for the repository's current use notice.
