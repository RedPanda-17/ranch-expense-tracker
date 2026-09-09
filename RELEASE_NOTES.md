# Release Notes - Version 2.1.2

**Release date:** September 9, 2026  
**Release name:** Past Reports Polish

## Version 2.1.2 past reports polish
- Aligns the Download PDF and Download CSV buttons to the left edge of each Past Reports card.
- Keeps the buttons grouped together consistently on desktop and mobile.
- This is a visual-only change; report generation, receipt storage, and cloud sync are unchanged.

## Version 2.1.1 manual accounting review
- Removes the local Tesseract OCR step from employee PDF generation.
- Receipts are still included in the report for Accounting to review manually.
- Lightweight checks for missing documents, duplicate expenses, and out-of-period dates remain.
- This reduces device processing and removes the external OCR library from the active report-generation path.

## Version 2.1.0 scalable cloud sync
- Syncs expense/report metadata first so a new device can become usable without downloading the user’s entire receipt history.
- Downloads a receipt only when it is viewed or needed for a generated document.
- Keeps cloud-viewed files temporary instead of persisting them in local IndexedDB.
- Removes redundant local receipt binaries after a confirmed cloud upload while preserving the original cloud copy.
- Adds support for a receipt purge marker so future Accounting archival can remove old receipt files without deleting expense/report history.

## Version 2.0.2 update guard
- Checks the live release marker before the employee reaches sign-in or account creation.
- Shows a simple startup status while checking and a clear update message when a new build is being activated.
- Automatically activates the newest service worker and reloads into the current production shell instead of requiring users to manually close and reopen the PWA.
- Displays the running version on the account gate for support/troubleshooting.
- Falls back safely when offline without deleting Version 1.x data or Version 2 local working data.
