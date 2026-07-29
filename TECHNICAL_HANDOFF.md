# Technical Handoff

## Architecture

Ranch Expense Tracker is a static, local-first progressive web application built with HTML, CSS, and browser JavaScript. It has no server-side application code and no external database.

- Expense, report, profile, and draft records: browser `localStorage`
- Receipt files: browser `IndexedDB`
- PDF generation: local JavaScript PDF writer
- CSV generation: local JavaScript
- Offline support: service worker after the application is served over HTTP or HTTPS
- Installation metadata: standards-based manifest, mobile meta tags, and platform-sized PNG icons

## Backward compatibility

Version 1.3 keeps the Version 1.x storage keys and receipt database names:

- `workExpenseTool.expenses.v1`
- `workExpenseTool.reports.v1`
- `workExpenseTool.settings.v1`
- `workExpenseTool.reportDraft.v1`
- IndexedDB database `workExpenseReceiptDB`, store `receipts`

This allows the release to read local records produced by earlier versions on the same browser origin and data container. Moving to a different URL, browser, profile, device, or an operating-system-specific web-app container may expose a different storage area. Users should export a backup before migration and import it afterward.

## Deployment

Host the complete folder on an approved static HTTPS site. GitHub Pages is suitable for controlled testing. The web server should return normal MIME types for HTML, CSS, JavaScript, JSON, PNG, SVG, and web manifests. No build step is required.

Do not distribute only `index.html`. The hosted version also requires CSS, JavaScript, manifest, version metadata, service worker, SVG icon, and PNG icons. The standalone HTML is included for review and emergency single-file use, but it cannot provide the complete hosted PWA installation and service-worker experience.

## Progressive web-app configuration

- Standard capability metadata: `mobile-web-app-capable`
- Apple compatibility metadata: `apple-mobile-web-app-capable`
- Apple touch icon: `app-icon-180.png`
- Manifest icons: `app-icon-192.png`, `app-icon-512.png`, and `app-icon.svg`
- Manifest app identity and navigation boundary: `id`, `start_url`, and `scope`
- Offline application shell: `service-worker.js`

The service-worker cache name must change whenever published application assets change so installed copies retrieve the new release.

## Security and privacy considerations

- The application does not upload expense data automatically.
- Anyone with access to the browser profile or installed app data may be able to view locally stored records.
- Backups contain expense details and receipt files and should be handled as confidential business records.
- Clearing browser/app data can permanently remove records that were not backed up.
- Installation does not provide authentication, multi-user accounts, centralized retention, device-to-device sync, or server backups.
- Safari web apps on macOS use website data separate from normal Safari browsing data; install first or migrate with backup/restore.
- IT should validate retention, access, device-management, acceptable-use, and support requirements before broader deployment.

## Main configuration points

- Version: `APP_VERSION` near the top of `app.js`
- Release name: `RELEASE_NAME` near the top of `app.js`
- Mileage rate: `FIXED_MILEAGE_RATE` near the top of `app.js`
- Published release metadata: `version.json`
- Install metadata and icons: `manifest.webmanifest` and HTML `<head>`
- Cached files: `service-worker.js`

## PDF, CSV, and report email workflow

PDFs include report and expense details, receipt pages, and embedded original receipt attachments when supported. CSV exports use one expense per row and include report metadata, mileage fields, receipt status, notes, and category-specific fields.

Email PDF and Email CSV create and download the report locally, then open a `mailto:` message addressed to the saved Default report recipient. Browsers do not permit the application to attach the generated local file automatically to a `mailto:` draft. Native Share actions remain available for supported mobile devices and may pass the file directly to the selected app.
