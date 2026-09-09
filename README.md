# Ranch Expense Tracker

Current release: **Version 2.1.2 — Past Reports Polish**

Live app: https://redpanda-17.github.io/ranch-expense-tracker/

## Purpose
Ranch Expense Tracker is a Progressive Web App for recording personal business expenses and mileage, attaching supporting documents, organizing reimbursement reports, and exporting PDF/CSV files.

The employee-facing application is considered feature-complete for the current pilot. Future work is expected to focus on Accounting workflow, automation, and company-approved authentication/hosting decisions rather than adding more employee-side features.

## Current architecture
- **GitHub Pages** hosts the static employee application.
- **Supabase Auth** provides account sign-in.
- **Supabase Postgres** stores employee profiles, expenses, reports, current report state, and saved defaults.
- **Private Supabase Storage** stores receipt and mileage-support files in the `expense-documents` bucket.
- **Browser localStorage/IndexedDB** are used as temporary/offline working storage, not the long-term system of record.
- **Service Worker Cache Storage** keeps the application shell available for installed/offline use.

## Receipt behavior
After a receipt is successfully synchronized to Supabase, the redundant app-managed local binary is removed. When the employee later views a cloud-backed receipt, that individual file is downloaded temporarily for viewing and released when the viewer closes.

Generating a PDF can temporarily retrieve the supporting documents needed for that report. Receipt OCR is not performed in the employee application; Accounting performs normal receipt review.

## Security model
- Authentication is required before accessing Version 2 data.
- Row Level Security limits normal employee database access to the authenticated user's records.
- Supporting documents are stored in a private bucket and scoped to the authenticated user's path.
- Submitted reports and attached expenses/supporting files are protected from normal employee modification or deletion.
- Administrative/service-role credentials are not embedded in the public GitHub Pages frontend.

The current controlled pilot restricts signup to `@pizzaranch.com`, but email confirmation is not currently enabled. Broader deployment should use a company-approved identity/verification approach such as Microsoft Entra/SSO or approved email verification.

## Current application files
- `index.html` — self-contained live application
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — app-shell caching and offline fallback
- `icon-192.png` / `icon-512.png` — installed-app icons
- `version.json` — release metadata

## Documentation
- `USER_GUIDE.md` — employee workflow
- `WEB_APP_INSTALLATION_GUIDE.md` — browser/PWA installation
- `TECHNICAL_HANDOFF.md` — architecture, security, storage, migration, and future direction
- `RELEASE_NOTES.md` — current release notes
- `CHANGELOG.md` — release history
- `V2_AUDIT.md` — historical Version 2 pre-release audit

## Repository status
`main` is the production source of truth. Historical archive, feature, and hotfix branches are retained only as development history and are not active production branches.

## Use notice
See `COPYRIGHT.md` and `INTERNAL_USE_NOTICE.txt` for the repository's current use notice.
