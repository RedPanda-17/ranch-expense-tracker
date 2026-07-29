# QA Results - Version 1.3.0

Automated browser smoke testing was completed against the release source on July 28, 2026.

## Passed

- Application loads without JavaScript errors.
- Profile settings save successfully.
- Fixed mileage rate displays as $0.40 per mile and is not editable.
- Casey's can be entered as a Meals & Snacks merchant without a vague-purpose warning.
- Receipt image upload and local storage work.
- Report readiness checks update after required fields are completed.
- Current report PDF and CSV downloads work.
- Finalized report PDF and CSV downloads work.
- Finalized report defaults to Submitted.
- Past Report status list contains only Submitted, Approved, and Reimbursed.
- Mileage calculation: 100 miles produces $40.00 at the configured rate.
- Clear Expense History removes expenses and reports while preserving the user's name.
- Sample JSON backup restores the sample expense and receipt.
- Desktop and 390-pixel mobile layouts render without script errors.
- Sample PDF renders correctly as three pages with no clipped text or overlaps.
- Original receipt file is embedded in the sample PDF.

## Required before organization-wide release

- Accounting confirms the current company mileage rate.
- IT tests the approved hosted address on company-supported desktop and mobile browsers.
- IT confirms security, retention, support ownership, and backup expectations.
