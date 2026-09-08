# Release Notes - Version 2.1.0

**Release date:** September 5, 2026  
**Release name:** Scalable Cloud Sync

## Version 2.1.0 scalable cloud sync
- Syncs expense/report metadata first so a new device can become usable without downloading the user’s entire receipt history.
- Downloads a receipt only when it is viewed or needed for a generated document.
- Keeps cloud-viewed files temporary instead of persisting them in local IndexedDB.
- Removes redundant local receipt binaries after a confirmed cloud upload while preserving the original cloud copy.
- Adds support for a receipt purge marker so future Accounting archival can remove old receipt files without deleting expense/report history.

## Version 2.0.2 update guard
- Checks the live release marker before the employee reaches sign-in or account creation.
- Shows a simple startup status while checking and a clear update message when a new build is being activated.
- Automatically activates the newest service worker and reloads into the current production shell instead of requiring users to manually close and reopen the PWA.
- Displays the running version on the account gate for support/troubleshooting.
- Falls back safely when offline without deleting Version 1.x data or Version 2 local working data.

## Version 2.0.1 hotfix
- Fixes Version 1.x receipt migration uploads on iPhone/iPad by using verified binary content for Supabase Storage.
- Restores migrated receipt previews/PDF access when legacy binary bytes are present.
- Prevents the sign-in form from flashing briefly while an existing saved session is being restored.
- Keeps the server-side Pizza Ranch email-domain restriction and adds a matching friendly client-side message.

## Major architecture change
Ranch Expense Tracker now requires an account and synchronizes user data through Supabase.

Supabase Postgres is the cloud system of record for expenses, reports, the current report draft, profile information, and saved defaults. Supabase Storage is the cloud system of record for receipt and mileage-support files.

Browser storage remains available only as an offline working cache.

## Accounts and synchronization
- Sign in or create an account before using the application.
- Name is collected during account creation; department remains editable.
- Expenses and supporting files synchronize automatically at record level.
- Reports, current report selections, saved defaults, and mileage routes synchronize across devices.
- Offline changes save locally and retry after connectivity returns.
- Signing out clears that user's Version 2 local cache while preserving cloud data.
- Supabase Row Level Security and private Storage policies isolate one user's data from another.

## Submitted-history protection
Version 2.0.0 locks submitted reimbursement history for the employee.

Employees cannot:
- edit or delete a submitted expense;
- reopen or delete a submitted report;
- replace or delete a supporting receipt after its expense has been submitted.

Read/download access remains available to the owning employee.

## Existing Version 1.x data
After signing in, Version 2 can detect existing Version 1.x local data and offer a one-time import into the signed-in cloud account.

The migration merges records by stable IDs, preserves the original Version 1 local copy, uploads supporting documents through normal cloud sync, and records a per-user migration marker after synchronization succeeds.

## Employee experience changes
- Settings are organized into Account, Saved Defaults, Data & Support, and About.
- The Dashboard separates Unreported Expenses from Current Report Total.
- The reimbursement-status control is hidden from the employee interface for now; submitted reports remain available for download.
- Mileage no longer asks One Way versus Round Trip. Users enter the total miles traveled.
- Bulk local-history clearing, manual backup/restore, and employee Reopen Report were removed from Version 2.
- Mobile date fields received additional iPhone/Android sizing cleanup.

## PDF and receipt review retained
Version 1.5 PDF Accounting Review capabilities remain available, including advisory checks for receipt-total/date mismatches, tips over 20%, duplicate expenses, missing support, and selected potentially non-reimbursable items.

## PWA and dependency hardening
- New Version 2 service-worker cache namespace
- Network-first navigation with offline app-shell fallback
- User records are never placed in the service-worker cache
- Supabase browser SDK pinned to version 2.115.0 for the production build
- Production manifest/icon paths corrected for the repository root

## Security note
Supabase's database performance advisor reports no findings. The security advisor currently warns that leaked-password protection is disabled; Supabase documents this feature as available on Pro plans and above.
