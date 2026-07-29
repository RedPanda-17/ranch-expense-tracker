# Ranch Expense Tracker v1.3.4 - Cross-Device Trial Readiness

## Release purpose

This build prepares the local-first application for cross-device stress testing and a controlled employee trial coordinated with Pizza Ranch Accounting.

## Changes in v1.3.4

- Added the standard `mobile-web-app-capable` metadata while retaining Apple's mobile web-app metadata.
- Added dedicated 180x180, 192x192, and 512x512 PNG application icons for Apple, Android, Chrome, and Edge installation paths.
- Strengthened the web app manifest with an app ID, scope, relative start URL, language, categories, and PNG icon definitions.
- Updated the service-worker cache to include the new icons and force installed copies to retrieve the new release.
- Added an employee-ready web-app installation guide covering Windows Edge, desktop Chrome, Chromebook, Android Chrome, iPhone Safari, iPad Safari, Mac Safari, and the iOS/iPadOS Chrome alternative.
- Added installation troubleshooting and local-data warnings, including the separate storage behavior of Safari web apps on Mac.
- Retained the Current Report spacing fix, copyright notice, PDF/CSV email workflow, backup reminder fix, Casey's validation fix, and prior report improvements.

## Release gates

- Confirm the official fixed mileage reimbursement rate with Accounting.
- Publish and test the GitHub Pages address on the actual devices employees will use.
- Confirm installation, reopening, receipt storage, backup, PDF, CSV, and sharing on each supported device category.
- Have Accounting approve a real sample PDF and CSV before expanding beyond the first test group.
