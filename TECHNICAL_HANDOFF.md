# Technical Handoff - Version 1.4.0

## Current architecture

Ranch Expense Tracker is a static Progressive Web App hosted through GitHub Pages.

- HTML: `index.html`
- CSS: `app.css`
- JavaScript: `app.js`
- PWA manifest: `manifest.webmanifest`
- Offline cache: `service-worker.js`
- Version metadata: `version.json`

Live test URL: https://redpanda-17.github.io/ranch-expense-tracker/

## Data storage

- Expenses: `localStorage` key `workExpenseTool.expenses.v1`
- Reports: `localStorage` key `workExpenseTool.reports.v1`
- Settings: `localStorage` key `workExpenseTool.settings.v1`
- Current report: `localStorage` key `workExpenseTool.reportDraft.v1`
- Receipts and route images: IndexedDB database `workExpenseReceiptDB`, object store `receipts`
- Offline app assets: Cache Storage `ranch-expense-tracker-v1.4.0`

The application does not transmit expense data to GitHub or a Pizza Ranch server. Data leaves the browser only when the user exports or shares a file.

## Version compatibility

Version 1.4.0 intentionally keeps the Version 1.x production storage names. Deploying at the same protocol, domain, and path should preserve existing browser data. Changing the repository name, Pages path, or domain creates a different browser origin and therefore a different storage area.

The normalization functions preserve older fields where practical. A Version 1.3.4 sample backup was loaded successfully during compatibility testing.

## Security and operational limitations

- Publicly reachable URL
- No authentication or role-based access
- No centralized database
- No server-side validation or audit trail
- No automatic synchronization or managed retention
- Browser data can be lost if site data is cleared
- Backup JSON files contain confidential expense and receipt data

## Recommended IT direction

For permanent use, move the workflow to company-controlled hosting with:

- Microsoft Entra ID or another company identity provider
- Employee and Accounting roles
- Central database and receipt storage
- Encryption and managed backups
- Submission and reimbursement audit history
- Retention and deletion policies
- Monitoring and support ownership

## Current mileage configuration

`FIXED_MILEAGE_RATE` is defined near the top of `app.js` and is currently `0.40`. Update it only after Accounting confirms the approved rate, then change `version.json`, documentation, and the service-worker cache name.
