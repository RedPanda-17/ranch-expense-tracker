# Ranch Expense Tracker — SPFx Porting Plan

## Objective
Move the existing employee experience into SharePoint Online without redesigning the Ranch Expense Tracker workflow.

The intended production architecture is:

1. SharePoint Online hosts an SPFx full-page application.
2. Microsoft 365 / Entra provides the signed-in employee identity.
3. SharePoint Lists store structured expense, report, and preference data.
4. A private SharePoint Document Library stores receipt and mileage-support files.
5. The employee UI keeps the current Ranch visual design and business rules.
6. Accounting/admin functionality is authorized separately from employee functionality.

## Proposed SharePoint data model

### Expenses list
Recommended fields:
- Title / Expense ID
- Employee (Person or immutable Entra user ID + display fields)
- Expense Date
- Category
- Subcategory
- Merchant
- Amount
- Description
- Project or Trip Tag
- Notes
- Details JSON (initial migration option) or normalized detail columns
- Receipt Document ID / Path
- Submitted Report ID
- Created
- Modified

For the first migration, keeping variable category-specific details in one JSON text column can reduce schema churn while preserving the current behavior. IT can later normalize commonly reported fields if needed.

### Reports list
Recommended fields:
- Report ID
- Employee
- Report Name
- Department
- Period Start
- Period End
- Report Note
- Status
- Submitted Date
- Processed Date
- Accounting Notes
- Archive Status / Date

### User Settings list
Recommended fields:
- Employee
- Default Department
- Saved People JSON
- Saved Organizations JSON
- Saved Locations JSON
- Saved Vehicles JSON
- Saved Tags JSON
- Saved Mileage Routes JSON

For scale or reporting requirements, saved defaults can later be normalized into separate lists.

### Expense Documents library
Recommended organization:
`Expense Documents/<immutable employee id>/<expense id>/<receipt file>`

Use the employee's immutable Microsoft identity internally instead of relying only on email text.

## SPFx application structure

Suggested project layout:

- `src/webparts/ranchExpenseTracker/`
  - `RanchExpenseTrackerWebPart.ts`
  - `components/RanchExpenseTracker.tsx`
  - `components/views/DashboardView.tsx`
  - `components/views/AddExpenseView.tsx`
  - `components/views/CurrentReportView.tsx`
  - `components/views/HistoryView.tsx`
  - `components/views/PastReportsView.tsx`
  - `components/views/SettingsView.tsx`
  - `services/IExpenseDataService.ts`
  - `services/SharePointExpenseDataService.ts`
  - `models/Expense.ts`
  - `models/Report.ts`
  - `models/UserSettings.ts`
  - `styles/` migrated from the current Ranch design system

The key rule is that components consume an interface (`IExpenseDataService`) instead of calling SharePoint directly. That keeps UI/business behavior testable and makes the current prototype adapter easy to replace.

## Feature migration order

### Phase 1 — Visual and employee workflow parity
- Ranch header/navigation/layout
- Dashboard
- Add Expense
- categories/subcategories
- conditional detail fields
- Mileage
- saved defaults
- All Expenses
- Current Report
- Past Reports
- Settings

### Phase 2 — Real SharePoint data
- Current Microsoft 365 user
- Expenses list CRUD
- Reports list CRUD
- User Settings persistence
- Expense Documents upload/download
- employee access isolation

### Phase 3 — Report/output parity
- current PDF generator
- receipt pages in PDFs
- CSV exports
- receipt preview/download
- receipt compression and temporary viewing behavior

### Phase 4 — Accounting / governance
- Accounting role and dashboard
- return-for-correction
- processed history
- retention/archive workflow
- archive-first receipt purge
- Power Automate notifications or scheduled workflows if approved

## Authorization requirements
Do not treat the SharePoint UI or hidden navigation as a security boundary. Before real employee data is connected:
- employee access must be enforced by SharePoint permissions and/or application authorization logic backed by Microsoft identity;
- Accounting/Admin access must be separate;
- receipt library access must prevent one employee from browsing another employee's files;
- production authorization should be reviewed by Pizza Ranch IT.

## What can be proven before SharePoint DEV exists
- visual parity
- responsive behavior
- category/subcategory behavior
- validation/business rules
- report-selection flow
- output UI
- adapter boundary / code organization

## What requires SharePoint DEV to prove
- SPFx deployment in the Pizza Ranch tenant
- tenant-specific page chrome
- Microsoft identity behavior
- real list/document-library performance
- permission isolation
- document upload/download behavior
- Power Automate integration

## Cutover rule
Do not remove or disrupt the current production Ranch Expense Tracker until the SharePoint version has passed side-by-side employee testing, data/security review, and a migration plan approved by IT.
