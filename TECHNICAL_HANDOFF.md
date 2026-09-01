# Technical Handoff - Version 1.5.0

## Current architecture
Ranch Expense Tracker is a static local-first Progressive Web App hosted through GitHub Pages.

Current live application assets:
- `index.html` — self-contained application HTML/CSS/JavaScript
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline fallback and update handling
- `icon-192.png` / `icon-512.png` — installed-app icons
- `version.json` — release metadata

Live URL: https://redpanda-17.github.io/ranch-expense-tracker/

The current release no longer depends on the historical modular `app.js`, `app.css`, or `styles.css` files for the live application.

## Data storage
- Expenses: `localStorage` key `workExpenseTool.expenses.v1`
- Reports: `localStorage` key `workExpenseTool.reports.v1`
- Settings: `localStorage` key `workExpenseTool.settings.v1`
- Current report: `localStorage` key `workExpenseTool.reportDraft.v1`
- Receipts and route images: IndexedDB database `workExpenseReceiptDB`, object store `receipts`
- Offline app shell: Cache Storage managed by `service-worker.js`

Version 1.5.0 intentionally keeps the Version 1.x production storage names so existing local data remains compatible when users continue using the same protocol, domain, path, browser, and browser profile.

## Version 1.5.0 Accounting Review
The PDF generator performs advisory review checks without adding warning clutter to the employee-entry screens.

Checks include:
- receipt total versus entered reimbursement amount;
- receipt date versus entered expense date;
- tip percentage over 20%;
- possible duplicate expenses;
- missing supporting documents and dates outside the report period;
- OCR keyword review for possible alcohol, tobacco/nicotine, gift card/prepaid, lottery, and cash-equivalent items.

Receipt-total reconciliation attempts to use subtotal, tax, tip, and common fees before issuing a mismatch warning. The review output is advisory; Accounting should verify the attached receipt.

## OCR behavior
Image receipt OCR is performed in the browser. The OCR library/language resources are loaded on demand, so automatic receipt recognition requires internet connectivity when those resources are not already available. Receipt images are not intentionally uploaded to an application database for OCR processing.

## Backup and restore
Complete backups include expense/report/settings/draft data and supporting documents in a `.ranchbackup` file.

Version 1.5.0 uses record-first restore behavior:
1. Validate/decode the backup.
2. Restore expense/report/settings/draft records.
3. Restore receipt files to IndexedDB.
4. Report any receipt files that could not be restored instead of failing the entire recovery.

## Service worker and updates
The service worker uses a versioned cache for the app shell. Navigations and same-origin static assets prefer the network and use the cache as an offline fallback. New workers can activate immediately and claim clients, reducing stale installed-app behavior.

Do not solve ordinary version-update problems by clearing site data; local expense records and receipts may be removed.

## Security and operational limitations
- Publicly reachable GitHub Pages URL
- No authentication or role-based access
- No centralized database
- No server-side validation or audit trail
- No automatic multi-device synchronization
- No centrally managed retention or backup
- Browser/site data can be lost if cleared
- Exported PDFs, CSV files, backups, and receipts can contain confidential business information

## Current mileage configuration
`FIXED_MILEAGE_RATE` is defined in `index.html` and is currently `0.40`. Update it only after Accounting confirms the approved rate, then update the application version, `version.json`, documentation, and service-worker cache version.

## Repository preservation
Before the Version 1.5.0 repository cleanup, the prior main branch state was preserved as:
`archive-pre-1.5-cleanup-2026-09-01`

That branch retains superseded standalone builds and repository artifacts removed from the streamlined main branch.
