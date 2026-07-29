# QA Results - Version 1.3.4

Version 1.3.4 received static code, package, manifest, icon, and document validation on July 29, 2026. Actual installation behavior remains a required real-device test because the final experience is controlled by the employee's browser, operating system, and company device policies.

## Passed in the Version 1.3.4 regression

- JavaScript source passes a syntax check.
- Hosted and standalone files identify Version 1.3.4.
- Hosted HTML includes both `mobile-web-app-capable` and `apple-mobile-web-app-capable` metadata.
- Hosted HTML includes a dedicated 180x180 Apple touch icon.
- Manifest JSON parses successfully and includes app ID, start URL, scope, standalone display, language, theme/background colors, and PNG/SVG icons.
- PNG icons exist at the declared 180x180, 192x192, and 512x512 dimensions.
- Service worker uses a Version 1.3.4 cache name and pre-caches all required application and icon files.
- Version metadata and sample backup identify Version 1.3.4.
- Installation guide includes Windows Edge, desktop Chrome, Chromebook, Android, iPhone, iPad, Mac Safari, and iOS/iPadOS Chrome instructions.
- Installation guide DOCX and PDF render cleanly across four pages with no clipped text or layout overlap.
- Current Report spacing fix and prior PDF/CSV, backup, receipt, validation, and local-storage code paths remain unchanged from Version 1.3.3.

## Previously passed and unchanged

- Casey's meal entry validation
- Fixed mileage calculations at the configured $0.40 rate
- Receipt upload and IndexedDB storage
- PDF and CSV generation
- Submitted, Approved, and Reimbursed report statuses
- Profile-preserving Clear Expense History
- Backup creation, reminder clearing, and restore logic
- Desktop and mobile responsive layout smoke testing

## Required before employee onboarding

- Accounting confirms the current company mileage rate.
- Publish the complete Version 1.3.4 folder to GitHub Pages.
- Test installation from the published address on the company-supported Windows browser.
- Test iPhone Safari and, when applicable, Android Chrome installation.
- Confirm the installed app reopens, retains a test expense and receipt, and reports Version 1.3.4.
- Test backup download/restore and PDF/CSV download/share on each device category used by the first employee group.
- Confirm Outlook or the device email/share application behaves acceptably.
- Accounting reviews and approves the sample PDF and CSV.

## Required before organization-wide release

- IT confirms approved hosting, security expectations, retention requirements, support ownership, browser/device policy, and the long-term cloud or multi-account plan.
