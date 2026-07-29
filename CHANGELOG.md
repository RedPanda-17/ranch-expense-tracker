# Changelog

## 1.3.4 - Cross-Device Trial Readiness - 2026-07-29

### Added
- Standard mobile web-app capability metadata
- 180x180 Apple touch icon
- 192x192 and 512x512 PNG PWA icons
- Expanded manifest identity, scope, language, category, and icon metadata
- Cross-device web-app installation guide in PDF, DOCX, and Markdown formats
- Installation, update, local-storage, and uninstall troubleshooting guidance

### Changed
- Service-worker cache updated to Version 1.3.4 and includes all install icons
- Technical, employee, QA, release, and handoff documentation updated for installed web-app testing

## 1.3.3 - Final Pre-Trial Release - 2026-07-29

### Fixed
- Current Report autosave no longer removes spaces while users type
- Report name, department, and purpose preserve normal text entry
- Copyright and Pizza Ranch internal-use notice restored

## 1.3.2 - Final Trial Export Update - 2026-07-28

### Added
- Email PDF and Email CSV actions for Current Report and Past Reports
- Pre-addressed email subject and body using the saved Default report recipient
- Clear attachment instructions and report-transfer dialog
- Copy-recipient and download-again actions

### Changed
- Current Report export actions grouped by PDF and CSV
- Default report recipient now explains how it is used
- Native Share actions retained for mobile attachment workflows

## 1.3.1 - Release Candidate Fixes - 2026-07-28

### Fixed
- Hidden setup, mileage, backup, and transfer elements now remain hidden correctly
- Successful backup download/share clears the reminder and records the backup date
- Mileage routes in PDFs use supported plain-text separators

## 1.3.0 - Personal Expense Release - 2026-07-28

### Added
- Separate PDF and CSV download/share actions
- Compact report cover and receipt handling
- Submitted, Approved, and Reimbursed personal status controls
- Profile-preserving Clear Expense History workflow
- Fixed mileage-rate display and calculation
- Installable web-app manifest and offline cache support
- Single-file standalone review copy

### Changed
- Redesigned dashboard, forms, report builder, history, Past Reports, and Settings
- Improved PDF layout, CSV columns, mobile layouts, warnings, and first-use guidance

### Fixed
- Legitimate short merchant names such as Casey's no longer trigger vague-purpose warnings
- Backup transfer, receipt preview, and singular wording issues
