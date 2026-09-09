# Employee Feature Parity Checklist

Source of truth: production Ranch Expense Tracker Version 2.1.2 at repository root.

## Dashboard
- [x] Current report hero / Add Expense action
- [x] Unreported expenses metric
- [x] Current report total metric
- [x] Mileage metric
- [x] Needs attention metric
- [x] Current report category breakdown
- [x] Simple workflow card

## Add Expense
- [x] Amount
- [x] Merchant
- [x] Description with category-dependent requirement
- [x] Exact production category names
- [x] Exact production subcategory names
- [x] Project or trip tag
- [x] Expense date
- [x] Optional note
- [x] Receipt / route-document chooser
- [x] Local preview in prototype
- [x] Mileage hides merchant/amount
- [x] Fixed $0.40 mileage calculation
- [x] Saved mileage route selection
- [x] Starting location / destination / miles
- [x] Auto vehicle follow-up for maintenance-type subcategories
- [x] Meeting meal attendees
- [x] Vendor / franchisee organization
- [x] PR employee meeting attendees
- [x] Draft edit
- [x] Draft delete
- [ ] Production duplicate-warning behavior
- [ ] Production receipt compression behavior

## Current Report
- [x] Report name
- [x] Department
- [x] Period start / end
- [x] Report note
- [x] Current / previous pay-period shortcuts
- [x] Expense search
- [x] Tag filter
- [x] Category filter
- [x] Select filtered / all / clear
- [x] Readiness checks
- [x] Selected total
- [x] Finalize Report
- [x] Submitted expenses lock
- [x] CSV export
- [ ] Production PDF generator with receipt pages

## All Expenses
- [x] Search
- [x] Category filter
- [x] Tag filter
- [x] Report state filter
- [x] Draft / submitted states
- [x] Edit / delete draft entries

## Past Reports
- [x] Submitted report cards
- [x] Locked report behavior
- [x] CSV download
- [ ] Production PDF download

## Settings
- [x] Microsoft 365 identity concept
- [x] Saved people
- [x] Saved organizations / merchants
- [x] Saved locations
- [x] Saved vehicles
- [x] Saved project / trip tags
- [x] Saved mileage routes
- [x] Fixed mileage-rate display/behavior
- [x] SharePoint migration map

## SharePoint production proof — requires DEV tenant
- [ ] SPFx full-page package deployment
- [ ] Current Microsoft 365 user identity
- [ ] Expenses list CRUD
- [ ] Reports list CRUD
- [ ] User Settings persistence
- [ ] Expense Documents upload/download
- [ ] Employee isolation / permissions
- [ ] Accounting/Admin authorization
- [ ] Real receipt temporary viewing
- [ ] Tenant-specific desktop/mobile layout validation
