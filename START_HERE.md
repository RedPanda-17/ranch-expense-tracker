# Ranch Expense Tracker v1.3.4 - Start Here

This folder contains the Version 1.3.4 Personal Expense Release prepared for internal Pizza Ranch use, controlled employee testing, and IT evaluation.

## Before regular use

Confirm the company mileage reimbursement rate with Accounting. This release is currently configured at **$0.40 per mile**. The rate is fixed for users and cannot be changed in Settings.

## Recommended launch path

1. Have Accounting confirm the mileage rate and review the sample PDF and CSV in the `sample` folder.
2. Publish the complete folder to the approved GitHub Pages or other static HTTPS address.
3. Use `Ranch_Expense_Tracker_Web_App_Installation_Guide.pdf` to install and test the app on each device type.
4. Test the hosted address in the company-supported browsers before entering real expenses.
5. Onboard a small employee group and require regular backups during the local-first trial.

## Included files

- `index.html`, `app.css`, `app.js` - hosted application source
- `manifest.webmanifest`, `service-worker.js` - installable web-app and offline support
- `app-icon.svg`, `app-icon-180.png`, `app-icon-192.png`, `app-icon-512.png` - cross-device application icons
- `Ranch_Expense_Tracker_v1_3_4_Standalone.html` - single-file review copy; not the preferred installable version
- `Ranch_Expense_Tracker_Web_App_Installation_Guide.pdf` - employee-ready device installation guide
- `Ranch_Expense_Tracker_Web_App_Installation_Guide.docx` - editable installation guide
- `WEB_APP_INSTALLATION_GUIDE.md` - source text for the installation guide
- `USER_GUIDE.md` - employee operating instructions
- `TECHNICAL_HANDOFF.md` - IT architecture and deployment notes
- `RELEASE_NOTES.md`, `CHANGELOG.md`, and `VERSION_HISTORY.md` - release documentation
- `QA_CHECKLIST.md` and `QA_RESULTS.md` - release verification and remaining device tests
- `MILEAGE_RATE_CONFIGURATION.md` - mileage-rate update instructions
- `sample/` - sample PDF, CSV, and backup

## Data model

Expense data and receipts remain in the user's browser or installed web-app data container. The hosted application files do not receive or store employee expense data. Installation does not create an account or sync data between devices. Users must create backups before clearing browser data, uninstalling, changing devices, changing browsers, or moving to a different hosted address.
