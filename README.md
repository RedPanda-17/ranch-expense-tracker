# Ranch Expense Tracker

**Current release:** Version 1.4.0 - Employee Workflow Release  
**Live testing site:** https://redpanda-17.github.io/ranch-expense-tracker/

Ranch Expense Tracker is a local-first web application for personally recording business expenses and mileage, attaching supporting documents, organizing reports, and exporting PDF and CSV files.

## Start here

- Employees: read `USER_GUIDE.md` and the installation guide.
- Accounting: review `sample/Expense-Report-Sample.pdf`, `sample/Expense-Report-Sample.csv`, and `RELEASE_NOTES.md`.
- IT: begin with `TECHNICAL_HANDOFF.md`, `UPGRADE_NOTES.md`, and the hosted source files.

## Current application files

The GitHub Pages release uses:

- `index.html`
- `app.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `version.json`
- `app-icon-*` files

`Ranch_Expense_Tracker_v1_4_0_Standalone.html` is a single-file review copy. The hosted source files should be used for GitHub Pages.

## Important storage model

Expense records, reports, settings, and report drafts are stored in browser `localStorage`. Receipts and route images are stored in browser IndexedDB. No expense data is uploaded to GitHub by the application.

Data is tied to the website address, device, browser, and browser profile. Employees should use the same browser and regularly download backups.

## Version 1.4.0 highlights

- Simplified Add Expense workflow
- Original broad categories with optional subcategories
- Conditional fields based on the selected subcategory
- Description required for Education, Supplies, Other, and broad Other subcategories
- Optional project or trip tags
- Searchable saved-default dropdowns with Add New
- Mileage route documentation instead of a purchase receipt
- Pay-period report-name helper for the 1st-15th and 16th-end of month
- Optional Report Note
- Past Reports statuses limited to Submitted and Reimbursed
- Reopen Report instead of deleting finalized reports

## Known limitations

- The current site is publicly reachable.
- The application has no user authentication or centralized database.
- Data is not synchronized between devices or browsers.
- The fixed mileage rate remains $0.40 per mile until Accounting confirms another rate.
- Native sharing and email behavior varies by browser and device.

Copyright © 2026 Saul Garcia. All Rights Reserved. Licensed for Pizza Ranch internal business use and IT evaluation.
