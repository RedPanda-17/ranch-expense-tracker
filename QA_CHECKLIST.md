# Release QA Checklist

## Configuration
- [ ] Accounting confirmed the mileage rate.
- [ ] `FIXED_MILEAGE_RATE` and `version.json` contain the same rate.
- [ ] Version number and service-worker cache name are current.

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
- [ ] Share PDF and Share CSV work on supported mobile devices.
- [ ] Download fallback appears where native sharing is unavailable.
- [ ] Finalized reports appear in Past Reports.
- [ ] Status options are exactly Submitted, Approved, and Reimbursed.

## Data protection
- [ ] Backup export contains expenses, reports, settings, drafts, and receipts.
- [ ] Backup restore works on a clean browser profile.
- [ ] Clear Expense History removes expense records and receipts.
- [ ] Clear Expense History preserves the user's name and profile settings.
- [ ] Moving between deployment URLs is tested with backup and restore.

## Browser and device checks
- [ ] Current company-supported desktop browser
- [ ] Current iPhone Safari
- [ ] Current Android Chrome, when applicable
- [ ] Installed Home Screen experience
- [ ] Offline reopening after first hosted load
