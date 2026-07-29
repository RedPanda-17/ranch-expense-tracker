# Release QA Checklist - Version 1.3.4

## Configuration
- [ ] Accounting confirmed the mileage rate.
- [ ] `FIXED_MILEAGE_RATE` and `version.json` contain the same rate.
- [ ] Hosted app, standalone app, `version.json`, and sample backup identify Version 1.3.4.
- [ ] Service-worker cache name is Version 1.3.4.

## Installable web-app package
- [ ] Hosted HTML includes `mobile-web-app-capable`.
- [ ] Hosted HTML retains `apple-mobile-web-app-capable`.
- [ ] Hosted HTML links the 180x180 Apple touch icon.
- [ ] Manifest parses and includes `id`, `start_url`, `scope`, `display`, and valid icons.
- [ ] 180x180, 192x192, and 512x512 PNG icons exist and display correctly.
- [ ] Service worker caches all required hosted files and icons.
- [ ] GitHub Pages serves the manifest and icons without 404 or MIME-type errors.

## Expense entry
- [ ] Every category can be saved and edited.
- [ ] Casey's works as a Meals & Snacks merchant without a vague-description warning.
- [ ] A genuinely vague business purpose produces a useful warning.
- [ ] Receipt image and PDF files can be attached, viewed, and downloaded.
- [ ] Duplicate expense warning works.
- [ ] Mileage uses the fixed rate and is not editable in Settings.

## Reports
- [ ] Readiness checks identify missing report and expense information.
- [ ] PDF downloads successfully and receipts are readable.
- [ ] CSV downloads successfully and opens with one expense per row.
- [ ] Email PDF and Email CSV use the saved Default report recipient and open a pre-addressed message.
- [ ] Email actions download the correct file and clearly identify which file to attach.
- [ ] Share PDF and Share CSV work on supported mobile devices.
- [ ] Download fallback appears where native sharing is unavailable.
- [ ] Finalized reports appear in Past Reports.
- [ ] Status options are exactly Submitted, Approved, and Reimbursed.

## Data protection
- [ ] Backup export contains expenses, reports, settings, drafts, and receipts.
- [ ] Successful backup clears the backup reminder and records the date.
- [ ] Backup restore works on a clean browser/app profile.
- [ ] Clear Expense History removes expense records and receipts.
- [ ] Clear Expense History preserves the user's name and profile settings.
- [ ] Moving between deployment URLs is tested with backup and restore.

## Device installation and reopening
- [ ] Windows 10/11 Microsoft Edge installation
- [ ] Windows or Mac Google Chrome installation, when applicable
- [ ] Chromebook installation, when applicable
- [ ] Android Chrome installation, when applicable
- [ ] iPhone Safari Add to Home Screen with Open as Web App
- [ ] iPad Safari Add to Home Screen with Open as Web App
- [ ] Mac Safari Add to Dock, when applicable
- [ ] Installed app reports Version 1.3.4
- [ ] Installed app closes and reopens with test data intact
- [ ] Offline reopening after one successful hosted load
- [ ] Company device policy does not block installation, file downloads, receipt selection, or sharing

## Text-entry regression
- [ ] Report name accepts spaces between words without removing them.
- [ ] Report department accepts spaces.
- [ ] Overall report purpose accepts spaces and punctuation.
- [ ] Merchant, business purpose, notes, dynamic detail fields, Settings, and saved reference lists accept spaces.
- [ ] Autosave does not move the cursor or rewrite the active field while typing.

## Trial approval
- [ ] Accounting approved sample PDF and CSV.
- [ ] First testers received the installation guide and local-data/backup warning.
- [ ] Support contact and feedback process are clear.
