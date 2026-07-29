# QA Results - Version 1.3.3

Version 1.3.3 received targeted code-level regression testing on July 29, 2026. This patch corrects Current Report text-entry behavior and restores the copyright/internal-use notice while retaining the tested v1.3.2 export workflow.

## Passed in the Version 1.3.3 regression

- JavaScript source passes a syntax check.
- Current Report autosave preserves spaces in report name, department, and overall purpose.
- A report title entered as `July First Half Report` remains exactly `July First Half Report` instead of becoming `JulyFirstHalfReport`.
- Required-field validation still trims surrounding whitespace when deciding whether a field is empty.
- Expense-entry, dynamic category, search, Settings, saved-reference, and route text fields have no space-blocking keyboard handler or input sanitizer.
- Hosted and standalone files contain the same v1.3.3 input fix.
- The visible footer contains the Saul Garcia copyright notice and Pizza Ranch internal-use license.
- The service-worker cache name changed to v1.3.3 so published browsers request the corrected files.
- The sample backup identifies Version 1.3.3.
- JavaScript source contains no global key handler that prevents the spacebar in text fields.

## Previously tested workflows retained from v1.3.1-v1.3.2

- Casey's merchant entry is accepted when the business purpose is specific.
- Fixed mileage calculations use $0.40 per mile pending Accounting confirmation.
- PDF and CSV Download, Email, and Share actions are present for current and past reports.
- The saved Default report recipient powers the Email PDF and Email CSV preparation workflow.
- A completed backup records `lastBackupAt` and hides the backup reminder.
- Clear Expense History preserves the employee profile.
- Past Report status options are Submitted, Approved, and Reimbursed.

## Required before employee onboarding

- Accounting confirms the current company mileage rate.
- Saul stress-tests the published GitHub Pages build in the company-supported desktop browser.
- Test receipt upload, PDF/CSV download, native sharing, prepared email, backup, and restore on the actual employee devices selected for the trial.
- Accounting reviews and approves a real sample PDF and CSV.

## Required before organization-wide release

- IT confirms the approved hosting address, security expectations, retention requirements, support ownership, and backup expectations.
