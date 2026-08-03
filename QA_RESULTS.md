# QA Results - Version 1.4.0

**Build date:** August 3, 2026

## Automated and structural checks passed

- JavaScript syntax check
- Manifest and version JSON parsing
- Hosted and standalone version labels
- Production local-storage and IndexedDB names
- Education description requirement
- Auto expense without Description
- Other category without Subcategory
- Mileage calculation at $0.40 per mile
- Pay-period date calculation and manual report-name override
- PDF and CSV generation
- Submitted/Reimbursed status list
- No Past Reports Delete action
- Legacy Version 1.3.4 sample-data compatibility
- Mobile viewport with no page-level horizontal overflow
- ZIP integrity and SHA-256 manifest

## Sample report verification

The generated sample PDF rendered successfully as five pages. The cover, expense details, and three sample supporting-document pages were visually reviewed without clipping, overlap, or broken glyphs.

## Environment limitation

The automated browser environment blocks normal URL navigation and IndexedDB access. UI logic was executed in an isolated browser document with in-memory localStorage and simulated sample receipt records. Real GitHub Pages deployment, IndexedDB persistence, installed-app updates, Outlook behavior, and device-native sharing still require manual testing on company-supported devices.
