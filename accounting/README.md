# Accounting Dashboard Mock

This folder contains the first visual prototype for a future Ranch Expense Tracker Accounting Portal.

## Status
- Prototype only
- Uses sample data only
- No Supabase connection
- No Accounting role/RLS changes
- No receipt downloads, report processing, archive, or purge actions are live
- Kept on `feature-accounting-dashboard-mock` so the production employee app on `main` is unchanged

## Prototype sections
- Dashboard overview
- Review Queue
- Report History
- Employees
- Archive
- Accounting Settings
- Report review drawer with future PDF / Process / Return actions

## Intended future architecture
The Accounting Portal can eventually use the existing Supabase project, but it will require dedicated Accounting/Admin roles plus new Row Level Security and Storage policies. UI separation alone is not an authorization boundary.

The first production milestone should focus on read-only Accounting access to submitted reports and temporary receipt viewing before adding any write actions such as Return, Processed, Archive, or Purge.
