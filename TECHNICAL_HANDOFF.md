# Technical Handoff - Version 2.1.2

## Current status
Ranch Expense Tracker is a static Progressive Web App hosted through GitHub Pages. Supabase provides authentication, PostgreSQL data storage, and private supporting-document storage.

The employee-facing application is considered feature-complete for the current pilot. Future development should focus on Accounting workflow, automated reimbursement cycles, archival/retention, and company-approved identity/hosting decisions.

Live URL: https://redpanda-17.github.io/ranch-expense-tracker/

## Production architecture
- `index.html` — self-contained employee application HTML/CSS/JavaScript
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — application-shell caching and offline fallback
- `version.json` — live release marker used by the startup updater
- GitHub Pages — static application hosting
- Supabase Auth — employee authentication
- Supabase Postgres — profiles, expenses, reports, report draft/state, saved defaults, and receipt metadata
- Private Supabase Storage — receipt and mileage-support files in the `expense-documents` bucket
- Browser localStorage/IndexedDB — temporary/offline working cache only

Supabase is the cloud system of record for authenticated Version 2 data.

## Receipt storage behavior
Receipt binaries are intended to remain cloud-first after successful synchronization.

1. A newly attached receipt can exist locally long enough to save and upload safely.
2. After the Storage upload and database synchronization succeed, the redundant app-managed IndexedDB copy is removed.
3. Opening a cloud-backed receipt downloads only that receipt temporarily.
4. Closing the receipt viewer releases the temporary object used by the app.
5. Generating a PDF temporarily retrieves the supporting documents required for that report.

The employee application does not persist the user's full cloud receipt history on each device.

A `receipt_purged_at` field exists so future Accounting archival can remove an old Storage object while retaining the expense/history row and receipt metadata.

## Authentication and isolation
Authentication is required before Version 2 application use.

Current controls include:
- Row Level Security limiting employee-owned database records to the authenticated user.
- Private Storage policies scoped to the authenticated user's document path.
- Submitted report/expense protections that prevent normal employee modification or deletion after submission.
- No Supabase service-role/admin credential embedded in the GitHub Pages frontend.

The current controlled pilot restricts signup to `@pizzaranch.com`. Email confirmation is currently disabled, so the domain restriction does not independently prove mailbox ownership. Before broader deployment, use a company-approved verification/identity method such as Microsoft Entra/SSO or approved email verification.

## Synchronization behavior
Synchronization is record-based rather than full-device backup replacement.

Important rules:
- Missing local cache data does not imply cloud deletion.
- Explicit employee deletion is required for an eligible unsubmitted expense.
- Cloud tombstones protect against stale local records reappearing.
- Stable record IDs are preserved.
- Offline changes can remain local temporarily and retry after reconnect.
- New devices synchronize expense/report records without downloading the user's entire receipt library.

Current technical debt: expense/report row synchronization still retrieves the user's available historical rows rather than using a fully paginated/incremental watermark model. This is acceptable for the current pilot but should be revisited at larger scale.

## Version 1 migration
Existing Version 1.x local data can be offered for one-time import after authentication.

Migration principles:
- Never migrate before authentication.
- Preserve the original Version 1 source data.
- Merge by stable IDs.
- Upload legacy supporting documents through normal Version 2 synchronization.
- Avoid importing old local data from a secondary device after the account is already populated from the authoritative device.

Do not clear browser/app data or uninstall an old PWA that still contains legacy data until migration has been verified.

## PDF and Accounting review
Employees can currently build/finalize a report and download PDF or CSV files.

The PDF contains the expense details and supporting documents needed for normal Accounting review. In-browser Tesseract OCR was removed in Version 2.1.1, so the employee's device no longer scans receipt text for totals, dates, tips, or restricted items during PDF generation.

Lightweight non-OCR checks may still identify missing documentation, possible duplicate expenses, or expenses outside the selected report period.

## Future Accounting direction
The current employee workflow can remain in place while Accounting requirements are validated.

Potential next phase:
- Accounting work queue/dashboard for submitted employee reports.
- Employee reimbursement preference: twice monthly (1–15 and 16–month end) or once monthly.
- Automated report creation after a defined grace period following the reimbursement cycle.
- Employee reminders before automatic submission.
- Accounting archive package/download followed by explicit receipt purge after the approved retention period.
- Long-term archive stored in a company-controlled location such as SharePoint/OneDrive if approved by IT/Accounting.
- Optional server-side OCR/document analysis for Accounting only if it proves valuable.

Any company-wide Accounting or purge capability must be implemented with privileged server-side authorization; a service-role credential must never be exposed in the browser application.

## Current employee-interface decisions
- Employee reimbursement status exists in the data model but is not a primary employee-facing control.
- Mileage stores total miles.
- Submitted reports remain locked from employee reopening/editing.
- Settings include account, saved defaults, data/support, and app information.
- Receipt OCR is not part of the employee workflow.

## Repository status
`main` is the production source of truth. Old archive, feature, and hotfix branches are historical development references only.

Release history is documented in `CHANGELOG.md` and `RELEASE_NOTES.md`.
