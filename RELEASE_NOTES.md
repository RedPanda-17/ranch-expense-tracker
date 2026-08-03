# Release Notes - Version 1.4.0

**Release date:** August 3, 2026  
**Release name:** Employee Workflow Release

## Expense entry

- Returned the Add Expense screen to a simpler receipt-first layout.
- Restored the original broad categories: Auto, Education, Meals & Snacks, Meetings (PR Employees), Supplies, Travel, Mileage, and Other.
- Added subcategories and conditional follow-up fields.
- Removed the subcategory field from Other.
- Made Description optional for most categories.
- Made Description required for Education, Supplies, Other, and any subcategory beginning with Other.
- Added optional project or trip tags.
- Added searchable saved-default dropdowns with Add New.

## Mileage

- Replaced the receipt label with Route Documentation.
- Added start, destination, miles, and one-way/round-trip fields.
- Route screenshots are recommended but do not block entry.
- Accounting may verify the shortest reasonable route.

## Reports

- Added Choose Pay Period for the 1st-15th and 16th-end of month.
- Pay-period selection fills dates and suggests a report name.
- Employees can override the suggested name.
- Replaced required Overall Business Purpose with optional Report Note.
- Added tag/category/search filtering and Select Filtered.
- Past Reports use Submitted and Reimbursed only.
- Removed Delete Report and added Reopen Report safeguards.

## Compatibility

- Production local-storage and IndexedDB names remain unchanged from Version 1.x.
- Existing Version 1.x browser data should remain available when the GitHub Pages address remains unchanged.
