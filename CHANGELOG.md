# Changelog

## 2.0.0 - September 5, 2026

### Added
- Account-required Supabase Auth sign-in and account creation
- Secure cloud synchronization for expenses, reports, current report draft, profile information, and saved defaults
- Private Supabase Storage synchronization for receipts and mileage-support files
- Offline local working cache with retry after reconnect
- One-time authenticated Version 1.x local-data migration path
- Record-level delete tombstones to prevent stale-device resurrection
- Submitted-history protection at both the user interface and database/storage policy layers
- Per-user Row Level Security and private Storage isolation

### Changed
- Supabase Postgres and Storage are now the Version 2 cloud systems of record
- Settings reorganized into Account, Saved Defaults, Data & Support, and About
- Dashboard separates Unreported Expenses from Current Report Total
- Name is captured during account creation and can be edited with department under Account settings
- Signing out clears the authenticated user's Version 2 local cache while leaving cloud data intact
- Mileage entry now uses total miles only; One Way/Round Trip was removed
- Description is no longer required for Supplies
- Successful expense save returns to Add Expense for faster entry
- Mobile date-input sizing improved for iPhone and Android browsers
- Supabase browser SDK pinned to 2.115.0 in the production app shell

### Removed
- Download Backup / Import Backup and `.ranchbackup` workflows from Version 2
- Backup reminders and backup timestamps
- Bulk Clear Expense History
- Employee Reopen Report
- Feedback/reimbursement recipient configuration fields
- Employee-facing reimbursement-status control for the current release

### Retained
- PDF and CSV reimbursement exports
- Version 1.5 PDF Accounting Review checks and receipt-total reconciliation
- Browser-based receipt OCR
- Searchable saved defaults, tags, pay-period helper, and mileage routes
- Network-first PWA update behavior with offline app-shell fallback
- Original Version 1.x local data left untouched for migration safety

## 1.5.0 - September 1, 2026

### Added
- PDF Expense Summary grouped by category and amount
- Blank Accounting Code field beside each expense on PDF detail pages
- Receipt thumbnail on expense detail pages while retaining full-size supporting-document pages
- PDF-only Accounting Review checks for receipt-total mismatch, receipt-date mismatch, tips over 20%, duplicate expenses, and missing supporting documents
- Receipt OCR review for possible alcohol, tobacco/nicotine, gift card/prepaid, lottery, and cash-equivalent items
- Receipt-total reconciliation using subtotal, tax, tip, and common fee lines before reporting an amount mismatch
- Conservative recovery of a plausible tip amount when OCR misses the TIP label on difficult receipts

### Changed
- Accounting warnings remain off the employee-entry screens and appear only in the PDF
- Backup restore recovers expense/report records before attempting receipt restoration and reports partial receipt failures instead of losing the entire restore
- Receipt-reading findings are explicitly advisory and require Accounting verification

### Retained
- Version 1.x localStorage and IndexedDB keys for compatibility
- iPhone/iPad single-file PDF download handling
- Network-first service-worker update behavior with offline fallback
- Receipt image optimization and adaptive PDF compression
- Tags, searchable saved defaults, pay-period helper, mileage workflow, and Submitted/Reimbursed report statuses

## 1.4.6 - August 17, 2026
- Improved iPhone/iPad PDF download behavior so Download PDF produces one file
- Added service-worker update reliability improvements to reduce stale installed versions
- Kept navigation network-first with an offline fallback

## 1.4.5 - August 2026
- Simplified report and backup actions to a download-first workflow
- Improved `.ranchbackup` handling and mobile download behavior

## 1.4.4 - August 2026
- Added receipt preview zoom
- Added adaptive PDF image compression

## 1.4.0 - August 3, 2026

### Added
- Conditional subcategory-specific expense fields
- Optional project or trip tags
- Search and filter by tag
- Select Filtered report action
- Searchable saved-default controls with Add New
- Mileage route-document workflow
- Pay-period report-name helper
- Optional Report Note
- Reopen Report workflow

### Changed
- Simplified Add Expense layout
- Description is required for Education, Supplies, Other, and broad Other subcategories
- Other no longer uses a subcategory
- Past-report statuses reduced to Submitted and Reimbursed
- Dashboard reimbursement wording updated

### Removed
- Required Overall Business Purpose
- Delete Report from Past Reports
- Generic Add Category Details expander

## 1.3.4 - July 29, 2026
- Cross-device web app installation readiness
- Mobile web app metadata and icons

## 1.3.3 - July 29, 2026
- Fixed spaces disappearing from Current Report text fields
- Restored copyright notice

## 1.3.2 - July 29, 2026
- Added Email PDF and Email CSV workflows

## 1.3.1 - July 29, 2026
- Fixed backup reminder and hidden-field behavior

## 1.3.0 - July 28, 2026
- Personal Expense Release with local data, PDF/CSV exports, and improved reporting
