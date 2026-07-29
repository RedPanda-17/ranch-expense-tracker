# Changelog

## 1.3.1 - Release Candidate Fixes - 2026-07-28

### Fixed
- HTML elements marked as hidden now stay hidden across the setup banner, mileage form, backup reminder, and transfer dialog fields
- Downloading or successfully sharing a backup now immediately clears the backup reminder and records the backup date
- Mileage routes in generated PDFs now use plain text instead of displaying an unsupported question-mark character

## 1.3.0 - Personal Expense Release - 2026-07-28

### Added
- Separate Download PDF, Download CSV, Share PDF, and Share CSV actions
- Compact report cover with quick expense list
- Original receipt attachments inside generated PDFs when supported
- Personal reimbursement status controls on finalized reports
- Profile-preserving Clear Expense History workflow
- Fixed-rate mileage display and calculation
- Installable web-app manifest and offline cache support
- Single-file standalone review copy

### Changed
- Redesigned navigation, dashboard, forms, report builder, history, Past Reports, and Settings
- Reduced PDF page count for smaller reports
- Expanded CSV columns for future accounting use
- Simplified Past Reports and removed unrelated tracking fields
- Improved mobile layouts, warnings, and first-use guidance

### Fixed
- Legitimate short merchant names such as Casey's no longer trigger vague-purpose warnings
- Singular report wording such as `1 expense` and `1 receipt`
- Backup download and transfer guidance
- Receipt preview and download handling
- Data clearing no longer removes the user's saved name or profile
