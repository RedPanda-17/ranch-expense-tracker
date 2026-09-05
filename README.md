# Ranch Expense Tracker

Current release: **Version 2.0.0 — Cloud Sync**

Live app: https://redpanda-17.github.io/ranch-expense-tracker/

## Purpose
Ranch Expense Tracker is a personal business expense and mileage Progressive Web App for capturing receipts, organizing expenses, building reimbursement reports, and exporting PDF/CSV files.

Version 2.0.0 moves the application from device-local storage to an account-required cloud-synchronized architecture while retaining local offline working storage.

## Version 2.0 highlights
- Supabase Auth account sign-in and account creation
- Secure per-user cloud synchronization for expenses, reports, the current report draft, profile information, and saved defaults
- Private Supabase Storage for receipt and mileage-support files
- Offline working cache after the application has loaded successfully online
- Sign out clears the signed-in user's V2 local cache while leaving cloud data intact
- Submitted reports, attached expenses, and supporting files are locked from employee editing or deletion
- One-time migration path for existing Version 1.x local data after the user signs in
- Compact Settings sections for Account, Saved Defaults, Data & Support, and About
- Dashboard separation between Unreported Expenses and Current Report Total
- Version 1.5 PDF Accounting Review and export capabilities retained

## Current application files
- `index.html` — self-contained live application
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — network-first app-shell caching and offline fallback
- `icon-192.png` / `icon-512.png` — installed-app icons
- `version.json` — release metadata

## Data architecture
Supabase is the cloud system of record for authenticated Version 2 data.

Browser `localStorage` and IndexedDB are used only as the Version 2 offline working cache. Missing local data does not mean cloud data should be deleted.

The Version 1.x local keys are left untouched so an authenticated user can be offered a one-time import of existing local data into the correct cloud account.

## Receipt OCR
Receipt recognition continues to run in the browser. OCR resources are loaded on demand, so automatic image-receipt reading requires internet access when those resources are not already available.

## Documentation
- `USER_GUIDE.md` — employee workflow
- `WEB_APP_INSTALLATION_GUIDE.md` — browser/PWA installation
- `TECHNICAL_HANDOFF.md` — architecture, security, migration, and operational notes
- `RELEASE_NOTES.md` — current release
- `CHANGELOG.md` — release history
- `V2_AUDIT.md` — Version 2 pre-release architecture and security audit

## Release preservation
- Pre-1.5 cleanup state: `archive-pre-1.5-cleanup-2026-09-01`
- Final pre-production 2.0 RC state: `archive-pre-2.0.0-production-2026-09-05`

## Use notice
See `COPYRIGHT.md` and `INTERNAL_USE_NOTICE.txt` for the repository's current use notice.
