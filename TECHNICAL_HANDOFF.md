# Technical Handoff

## Architecture

Ranch Expense Tracker is a static, local-first web application built with HTML, CSS, and browser JavaScript. It has no server-side application code and no external database.

- Expense, report, profile, and draft records: browser `localStorage`
- Receipt files: browser `IndexedDB`
- PDF generation: local JavaScript PDF writer
- CSV generation: local JavaScript
- Offline support: service worker after the application is served over HTTP or HTTPS

## Backward compatibility

Version 1.3 keeps the Version 1.x storage keys and receipt database names:

- `workExpenseTool.expenses.v1`
- `workExpenseTool.reports.v1`
- `workExpenseTool.settings.v1`
- `workExpenseTool.reportDraft.v1`
- IndexedDB database `workExpenseReceiptDB`, store `receipts`

This allows the new release to read local records produced by earlier versions on the same browser origin. Moving to a different web address creates a different browser storage origin, so users should export a backup before migration and import it afterward.

## Deployment

Host the complete folder on an approved static HTTPS site. The web server should return the normal MIME types for HTML, CSS, JavaScript, JSON, SVG, and web manifests. No build step is required.

Do not distribute only `index.html`; the normal hosted version also requires the CSS, JavaScript, icon, manifest, version file, and service worker. The standalone HTML is included for review and emergency single-file use, but hosted deployment is preferred.

## Security and privacy considerations

- The application does not upload expense data automatically.
- Anyone with access to the browser profile may be able to view locally stored records.
- Backups contain expense details and receipt files and should be handled as confidential business records.
- Clearing browser data can permanently remove records that were not backed up.
- IT should validate retention, access, device-management, and acceptable-use requirements before broader deployment.

## Main configuration points

- Version: `APP_VERSION` near the top of `app.js`
- Release name: `RELEASE_NAME` near the top of `app.js`
- Mileage rate: `FIXED_MILEAGE_RATE` near the top of `app.js`
- Published release metadata: `version.json`
- Cached files: `service-worker.js`

When releasing changed source files, update the service-worker cache name so existing installations retrieve the new files.

## PDF and CSV

PDFs include a report cover, compact expense list, detailed expense records, receipt pages, and embedded original receipt attachments when supported. CSV exports use one expense per row and include report metadata, mileage fields, receipt status, notes, and category-specific fields.


## Report email workflow

The Email PDF and Email CSV actions create and download the report locally, then open a `mailto:` message addressed to the saved Default report recipient. Browsers do not permit the application to attach the generated local file automatically to a `mailto:` draft. Native Share actions remain available for supported mobile devices and may pass the file directly to the selected app.
