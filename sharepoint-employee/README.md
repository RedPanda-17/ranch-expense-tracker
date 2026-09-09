# Ranch Expense Tracker — SharePoint Employee Mock

This folder demonstrates how the existing Ranch Expense Tracker employee experience can be presented inside SharePoint while preserving the current Ranch visual design and workflow.

## Purpose
- Keep the Ranch Expense Tracker interface visually consistent with Version 2.1.2.
- Show the extra Microsoft 365 / SharePoint chrome that would surround the application.
- Simulate the employee workflow before a real SharePoint DEV site and SPFx package exist.
- Provide a clickable prototype for IT and Accounting review.

## Mock only
This prototype uses sample/in-memory data only. It does not connect to SharePoint, Supabase, Microsoft Graph, or company data.

The production employee app is unchanged.

## Intended SharePoint mapping
- Microsoft 365 / Entra ID → employee identity and authentication
- SharePoint `Expenses` List → expense records
- SharePoint `Reports` List → report records
- SharePoint `Expense Documents` Library → receipts and mileage documents
- SharePoint employee-preference lists → saved defaults and settings
- SPFx full-page application → the Ranch Expense Tracker UI

## Visual goal
The application area should remain nearly identical to Ranch Expense Tracker. The main visible difference is the Microsoft 365 / SharePoint interface surrounding it. A real tenant may show slightly different SharePoint navigation or site chrome depending on Pizza Ranch IT settings.

## What requires a real SharePoint DEV environment
- SPFx package deployment
- current Microsoft 365 user identity
- real List and Document Library writes
- employee/accounting/admin permissions
- document access isolation
- Power Automate workflows
- tenant-specific SharePoint styling and navigation behavior
