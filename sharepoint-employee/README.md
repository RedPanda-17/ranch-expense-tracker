# Ranch Expense Tracker — SharePoint Employee Parity Prototype

This folder is the working employee-side SharePoint migration prototype. The goal is not to redesign Ranch Expense Tracker. The goal is to preserve the Version 2.1.2 employee experience and move the backend/infrastructure into Microsoft 365 and SharePoint.

## Hard requirement
The Ranch application area should remain visually and functionally as close as practical to the current Ranch Expense Tracker. SharePoint should be the host and backend, not a reason to replace the app with generic SharePoint list screens.

## Current parity work
The prototype now mirrors the current employee app structure:
- Dashboard
- Add Expense
- Current Report
- All Expenses
- Past Reports
- Settings
- production category names
- production subcategory names
- category/subcategory-driven fields
- Mileage at the current fixed $0.40/mile test rate
- receipt / route-document selection and preview
- saved people, merchants, locations, vehicles, tags, and mileage routes
- draft expense editing/deleting
- report expense selection and readiness checks
- report finalization / submitted locking behavior
- CSV export
- Microsoft 365 identity concept instead of a second app login

The mock stores sample/test state in browser `localStorage`. It does not connect to Supabase or Pizza Ranch SharePoint.

## Still to port for full parity
- Current production PDF generator and embedded receipt pages
- production receipt compression behavior
- real temporary receipt viewing/download behavior
- exact production duplicate-warning behavior
- any remaining minor validation/copy differences found during side-by-side testing
- production-grade accessibility/regression testing

## Intended SharePoint mapping
- Microsoft Entra / Microsoft 365 current user → employee identity and authentication
- SharePoint `Expenses` List → expense records
- SharePoint `Reports` List → report records
- SharePoint `Expense Documents` Library → receipts and mileage documents
- SharePoint `User Settings` / related lists → saved defaults and settings
- SPFx full-page application → Ranch Expense Tracker employee UI

## Portability design
`app.js` keeps storage behind `MockSharePointAdapter`. In the real SPFx project, that adapter is replaced with SharePoint API calls while the UI and business rules remain largely unchanged.

See `SPFX_PORTING_PLAN.md` for the production migration plan and proposed SharePoint schema.

## What requires a real SharePoint DEV environment
- SPFx package deployment
- real current-user identity from Microsoft 365
- real SharePoint List and Document Library writes
- employee/accounting/admin authorization
- receipt/document access isolation
- tenant-specific SharePoint navigation/chrome validation
- Power Automate or server-side workflows where required

## Safety
The production Ranch Expense Tracker at the repository root is intentionally untouched by this prototype work.
