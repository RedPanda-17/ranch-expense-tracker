# Changelog

## 1.1.0 — Accountant Edition

### Report workflow
- Simplified completed-report actions to **Share PDF**, **Export CSV**, and **Reopen Report**.
- Removed duplicate PDF/email actions and the separate email-composer panel.

### Backups
- Added **Share Backup** using the native share sheet when supported.
- Added a saved backup email address used in the share message and desktop fallback instructions.
- Kept **Save Backup to Files**, **Import Backup**, and full-history CSV export.

### Accountant PDF
- Added an answer-first cover page with employee, department, period, purpose, totals, report checks, category totals, and approval lines.
- Added a compact expense summary table with protected column lengths to prevent text overflow.
- Added full expense-detail pages so shortened table text is not lost.
- Matched receipt pages to the same expense numbers used in the summary.
- Preserved embedded original receipt files.

### Interface
- Reduced the dashboard to four actionable metrics and one prominent **Add Expense** action.
- Separated required expense information from optional notes.
- Reorganized Settings into **Profile**, **Data & Backups**, **Saved Defaults**, and **About**.

### Compatibility
- Preserved the existing local-storage keys and IndexedDB receipt database name.
- Preserved expense categories, validation, mileage, receipt viewing, report tracking, CSV exports, backup restore, and local-only storage.
