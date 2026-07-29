# Ranch Expense Tracker v1.3.3 - Start Here

This folder contains the Version 1.3.3 Personal Expense Release prepared for internal Pizza Ranch use and IT evaluation.

## Before regular use

Confirm the company mileage reimbursement rate with Accounting. This release is currently configured at **$0.40 per mile**. The rate is fixed for users and cannot be changed in Settings.

## Recommended launch path

1. Have Accounting confirm the mileage rate and review the sample PDF and CSV in the `sample` folder.
2. Have IT place the folder on an approved static web host. No database or server-side code is required.
3. Open `index.html` through the hosted address and test on the browsers employees will use.
4. Each employee enters their profile, adds expenses, and creates regular backups.

## Included files

- `index.html`, `app.css`, `app.js` - application source
- `manifest.webmanifest`, `service-worker.js`, `app-icon.svg` - installable web-app support
- `Ranch_Expense_Tracker_v1_3_3_Standalone.html` - single-file review copy
- `USER_GUIDE.md` - employee instructions
- `TECHNICAL_HANDOFF.md` - IT architecture and deployment notes
- `RELEASE_NOTES.md` and `CHANGELOG.md` - Version 1.3 changes
- `QA_CHECKLIST.md` - release verification
- `MILEAGE_RATE_CONFIGURATION.md` - one-value rate update instructions
- `sample/` - sample PDF, CSV, and backup

## Data model

Expense data and receipts remain in the user's browser. The hosted application files do not receive or store employee expense data. Users must create backups before clearing browser data, changing devices, or removing the application.
