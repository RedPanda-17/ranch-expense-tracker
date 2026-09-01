# Release Notes - Version 1.5.0

**Release date:** September 1, 2026  
**Release name:** PDF Accounting Review Update

## Accounting PDF
- Expense Summary now shows grouped category totals instead of repeating individual line items.
- Expense detail pages include a blank Accounting Code field.
- Image receipts appear as thumbnails beside the related expense detail and still receive a full-size supporting-document page.

## PDF-only Accounting Review
Version 1.5.0 keeps accounting-review warnings out of the employee-entry screens and places them only in the generated PDF.

The review engine can flag:
- Entered reimbursement amount that may not match the receipt total
- Receipt date that may not match the entered expense date
- Tips that appear to exceed 20%
- Possible duplicate expenses
- Missing supporting documents
- Expense dates outside the report period
- Possible alcohol items
- Possible tobacco/nicotine items
- Possible gift card/prepaid items
- Possible lottery or cash-equivalent items

These findings are advisory. Accounting should verify the attached receipt before making a reimbursement decision.

## Receipt-total reconciliation
Before reporting an amount mismatch, the app attempts to reconcile subtotal, tax, tip, and common fee lines. On difficult/faded receipts, it can conservatively recover a plausible tip amount from receipt structure when OCR misses the TIP label.

## Backup restore
Backup restore now recovers expense/report records first and then restores receipt files. A device-specific receipt-storage failure no longer prevents otherwise-valid expense/report records from being recovered; the app reports partial receipt failures to the user.

## Compatibility retained
- Version 1.x localStorage and IndexedDB names are unchanged.
- Existing Version 1.x browser data should remain available when the GitHub Pages address, browser, and browser profile remain unchanged.
- iPhone/iPad PDF single-file download handling is retained.
- Service-worker update handling remains network-first with an offline fallback.
- Receipt image optimization and adaptive PDF compression remain enabled.

## OCR connectivity note
Receipt recognition runs in the browser, but the OCR library/language resources are loaded on demand. Automatic image-receipt reading therefore requires internet access when those resources are not already available.
