# QA Results - Version 1.3.2

Version 1.3.2 received code-level regression testing on July 28, 2026. The core Version 1.3.1 browser workflow was previously smoke-tested; Version 1.3.2 changes only the report export controls and email-preparation workflow.

## Passed in the Version 1.3.2 regression

- JavaScript source passes a syntax check.
- Current Report includes grouped PDF and CSV actions for Download, Email, and Share.
- Past Reports includes Email PDF and Email CSV alongside the existing Download and Share actions.
- Email PDF and Email CSV use the saved Default report recipient.
- Prepared email subject includes the report name, employee name, and file format.
- Prepared email body includes the employee, report period, report total, and exact filename to attach.
- Email actions download the correct local file before opening the prepared-email step.
- The report-transfer dialog supports Open Email, Download Again, and Copy Email.
- A valid sample CSV was generated with Casey's, mileage, the fixed $0.40 rate, and one expense per row.
- A valid three-page PDF was generated with a report cover, expense details, and a rendered sample receipt.
- Mileage details use ASCII separators and no unsupported question-mark characters.
- Casey's and its specific business purpose pass report validation without warnings.
- A completed backup still hides the reminder and records `lastBackupAt`.

## Passed in the Version 1.3.1 browser smoke test and unchanged in 1.3.2

- Application loads without JavaScript errors.
- Profile settings save successfully.
- Fixed mileage rate displays as $0.40 per mile and is not editable.
- Receipt image upload and local storage work.
- Report readiness checks update after required fields are completed.
- Current and finalized report PDF/CSV downloads work.
- Finalized reports default to Submitted.
- Status options are exactly Submitted, Approved, and Reimbursed.
- Clear Expense History removes expenses and reports while preserving the user's name.
- Backup restore works with the sample expense and receipt.
- Desktop and 390-pixel mobile layouts render without horizontal overflow.

## Required before employee onboarding

- Accounting confirms the current company mileage rate.
- Test the published GitHub Pages address in the company-supported desktop browser.
- Test Share PDF and Share CSV on at least one employee phone.
- Confirm Outlook or the default email application opens the prepared recipient, subject, and body on company devices.
- Accounting reviews and approves the included sample PDF and CSV.

## Required before organization-wide release

- IT confirms the approved hosting address, security expectations, retention requirements, support ownership, and backup expectations.
