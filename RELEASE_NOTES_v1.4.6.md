# Ranch Expense Tracker v1.4.6 — iPhone PDF Download Update

## Problem fixed
On iPhone/iPad, tapping **Download PDF** could open WebKit's PDF preview/share flow instead of behaving like a normal file download. The resulting iOS share interface could treat the action as both a webpage link and a PDF.

## Changes
- Added Apple mobile device detection for iPhone, iPad, iPod, and iPadOS devices using desktop-style user-agent behavior.
- Generated PDF bytes are unchanged.
- On Apple mobile devices only, the downloadable Blob is presented to WebKit as `application/octet-stream` while the filename remains `.pdf`.
- This is intended to make Safari/WebKit treat the action as a file download rather than a PDF preview/share action.
- Removed the new-window fallback from the normal download helper; old-browser fallback now stays in the same window.
- No `navigator.share()` or email handoff is used by Download PDF.
- Android, Windows, macOS, and other normal download behavior remains unchanged.
- All v1.4.5 automatic service-worker update/cache fixes remain included.
- All v1.4.4 receipt zoom and adaptive PDF compression changes remain included.

## iPhone validation
After GitHub Pages deploys v1.4.6:
1. Open the app normally on the iPhone.
2. Confirm Settings > About shows Version 1.4.6.
3. Generate a report and tap **Download PDF**.
4. Confirm the action produces one PDF file rather than a share item containing both a link and a PDF.
5. Open the downloaded `.pdf` from Files/Downloads and confirm it renders normally.
6. Attach that downloaded PDF manually to a test email.

## Files to replace/upload in the repository root
- `index.html`
- `service-worker.js`
- `manifest.webmanifest`
- `version.json`

## Suggested GitHub commit
`v1.4.6: fix iPhone PDF download handling`
