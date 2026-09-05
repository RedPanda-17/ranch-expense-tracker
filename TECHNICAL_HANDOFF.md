# Technical Handoff - Version 2.0.0

## Current architecture
Ranch Expense Tracker is a static Progressive Web App hosted through GitHub Pages with Supabase providing authentication, cloud database storage, and private supporting-document storage.

Live URL: https://redpanda-17.github.io/ranch-expense-tracker/

Current live application assets:
- `index.html` — self-contained application HTML/CSS/JavaScript
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — network-first app-shell caching and offline fallback
- `icon-192.png` / `icon-512.png` — installed-app icons
- `version.json` — release metadata

## Version 2 data model
Supabase is the authenticated cloud system of record.

- Postgres: profiles, expenses, reports, current report draft, and saved defaults
- Storage: receipt and mileage-support files in the private `expense-documents` bucket
- LocalStorage/IndexedDB: offline working cache only
- Service-worker Cache Storage: application shell and pinned Supabase browser client only; user records are never cached by the service worker

Version 2 uses new V2 local cache keys and IndexedDB storage so the Version 1.x local data remains untouched for migration safety.

## Authentication and isolation
Supabase Auth is required before application use.

Row Level Security restricts user-owned database rows to the authenticated user. Storage policies scope supporting documents to the authenticated user's path. Two-account testing confirmed one account could not read the other account's expenses or receipts.

Signing out clears the signed-in user's Version 2 local working cache from that device while leaving cloud records intact.

## Submitted-history protection
Submitted reimbursement history is immutable to the employee.

Database and Storage protections prevent the employee from:
- editing or deleting an expense attached to a submitted report;
- reopening or deleting a submitted report;
- replacing or deleting the supporting document for a submitted expense.

Submitted records remain readable/downloadable by their owning user.

A future Accounting "Returned for correction" workflow is the intended supported path for reopening submitted records.

## Synchronization behavior
Version 2 uses record-level synchronization rather than replacing whole-device snapshots.

Important rules:
- Missing local data does not imply cloud deletion.
- Expense deletion must originate from an explicit employee delete action on an unsubmitted expense.
- Cloud tombstones win over stale local cache copies.
- Stable record IDs are not reused.
- Offline changes save locally and retry after reconnect.
- Saved-default deletion tombstones prevent removed choices from reappearing from another device.

## Version 1.x migration
After authentication, Version 2 can detect existing Version 1 local data and offer a one-time import into the signed-in account.

Migration rules:
1. Never migrate before authentication.
2. Show the signed-in account before import.
3. Merge records by stable IDs rather than replacing the cloud snapshot.
4. Copy legacy supporting documents into the V2 cache and upload through normal sync.
5. Merge saved defaults and the current report draft.
6. Leave the original Version 1 data untouched.
7. Record a per-user migration marker after successful cloud synchronization.
8. On failure, preserve the Version 1 source and allow synchronization to retry.

## PWA and offline behavior
The Version 2 service worker uses cache namespace `ranch-expense-tracker-v2-2.0.0`.

- Navigation remains network-first.
- The last successful application shell is available offline.
- Same-origin static assets can fall back to cache.
- Supabase browser SDK is pinned to `@supabase/supabase-js@2.115.0` and can be cached as part of the app shell.
- Supabase API responses containing user data are not cached by the service worker.
- The application begins with the UI inert/hidden until the persisted authentication state is resolved.

## PDF Accounting Review and OCR
Version 1.5 PDF Accounting Review behavior remains in Version 2. Receipt OCR continues to run in the browser and is advisory.

The application can flag possible amount/date mismatches, tips over 20%, duplicates, missing supporting documents, and selected potentially non-reimbursable items. Accounting should verify the attached receipt.

## Current employee-interface decisions
- Reimbursement status remains in the underlying data model but is hidden from the employee-facing Version 2 interface.
- Mileage stores total miles; One Way/Round Trip was removed.
- Manual backup/restore and Bulk Clear Expense History were removed from Version 2.
- Employee Reopen Report was removed.
- Settings are organized into Account, Saved Defaults, Data & Support, and About.

## Security status at release
Verified before production:
- RLS enabled and scoped to `auth.uid()` on the Version 2 user tables.
- Private supporting-document bucket.
- Submitted-record database and Storage protections.
- Internal `SECURITY DEFINER` trigger execution rights restricted.
- Supabase performance advisor reports no findings.

Open platform warning:
- Supabase security advisor reports leaked-password protection disabled. Supabase documents this feature as available on Pro plans and above.

The Auth Site URL and redirect allow-list should remain pointed at the production GitHub Pages URL for confirmation and recovery flows.

## Current mileage configuration
`FIXED_MILEAGE_RATE` remains defined in `index.html` and is currently `0.40`. Change it only after Accounting confirms an approved rate, then update the application version, release metadata, documentation, and service-worker cache namespace as appropriate.

## Release preservation
- Pre-1.5 cleanup state: `archive-pre-1.5-cleanup-2026-09-01`
- Final pre-production Version 2 RC state: `archive-pre-2.0.0-production-2026-09-05`

The `v2-rc/` directory remains as the generated release-candidate snapshot used immediately before the Version 2 production promotion. The former automatic RC workflow is intentionally retired because `main` now contains the Version 2 production source.
