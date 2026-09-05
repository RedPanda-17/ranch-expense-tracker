# Ranch Expense Tracker 2.0 — Pre-Release Architecture Audit

## Version decision

Version 2.0.0 is appropriate. The product architecture has changed from a device-local expense tracker with manual backup to an account-required, cloud-synchronized application with offline working storage.

## 2.0 architecture target

- Supabase Auth is required before the application can be used.
- Supabase Postgres is the cloud system of record for expenses, reports, current report draft, profile, and saved defaults.
- Supabase Storage is the cloud system of record for receipt and mileage-support files.
- LocalStorage and IndexedDB remain only as the offline working cache.
- Signing out clears the authenticated user's V2 local cache from that device while leaving cloud data intact.
- Missing local data never implies deletion.
- Expense deletion is allowed only for an unsubmitted expense and must originate from an explicit user delete action.
- Submitted reports and the expenses attached to them are immutable to the employee.
- A future Accounting "Returned for correction" workflow will be the only supported path for reopening submitted records.

## Legacy 1.x architecture that must not ship inside V2

The clean V2 production source must remove, rather than hide, the following:

- Download Backup / Import Backup workflow.
- Backup reminders and backup timestamps.
- `.ranchbackup` creation and restore functions.
- Backup-specific base64 receipt serialization.
- Feedback-recipient / reimbursement-recipient configuration fields.
- Bulk Clear Expense History.
- Employee Reopen Report action.
- Mileage One Way / Round Trip field and validation.
- 1.5 release notes and "Local to device" storage language.
- Test banners, research-only storage namespaces, hotfix wrappers, and runtime patch loaders.
- Automatic report-delete/tombstone behavior in the sync engine.

## Features validated in Test 6 that should be integrated directly into V2

- Account-required sign-in/create-account gate.
- Name and department captured during account setup and editable under Account settings.
- Sign out under Settings.
- Record-level automatic expense and receipt sync.
- Offline local save with retry after reconnect.
- Safe delete handling with no stale-device resurrection.
- Completed report, current report draft, and selection sync.
- Saved people, merchants, locations, vehicles, tags, and mileage-route sync.
- Saved-default deletion tombstones so removed choices do not reappear from another device.
- Dashboard separation between Unreported Expenses and Current Report Total.
- Compact Settings structure: Account, Saved Defaults, Data & Support, About.
- Submitted-history lock.
- User isolation through Supabase RLS and private Storage policies.

## Existing 1.5 data migration

V2 should use new V2 local cache keys and leave the current V1 keys untouched.

After the user signs in for the first time, V2 can detect the existing V1 local data and offer a one-time prompt:

> Existing Ranch Expense Tracker data was found on this device. Import it into this cloud account?

Migration rules:

1. Never migrate V1 data before authentication.
2. Show the signed-in email/account before importing so the user can avoid putting another person's local data into the wrong account.
3. Merge expenses and reports by their stable IDs rather than replacing the cloud snapshot.
4. Copy legacy IndexedDB receipt records into the V2 cache, then upload them through normal cloud sync.
5. Merge saved defaults and the current report draft.
6. Leave the original V1 local data untouched after migration.
7. Record a per-user migration marker after cloud sync succeeds so the same data is not repeatedly offered.

Only the two known existing users require this migration path, so a mass administrative migration tool is not necessary.

## Supabase audit

### Verified

- `profiles`, `expenses`, `reports`, and `report_drafts` have RLS enabled.
- RLS policies restrict rows to `auth.uid() = user_id`.
- The `expense-documents` Storage bucket is private.
- Storage policies scope objects to the authenticated user's first path segment.
- Two-account user testing confirmed that one account could not see the other account's expenses or receipts.
- Supabase performance advisor currently reports no findings.

### Security changes applied during this audit

- Revoked public/authenticated execution rights from internal `SECURITY DEFINER` trigger functions.
- Removed employee DELETE permission for submitted reports.
- Restricted expense DELETE policy to expenses that do not have a `submittedReportId`.
- Added database triggers that prevent an employee from altering/deleting submitted expense content.
- Added database triggers that prevent submitted report contents from being altered/deleted while still allowing Submitted/Reimbursed status tracking.

### Remaining Supabase configuration item

Supabase Security Advisor still reports that leaked-password protection is disabled. Enable Supabase Auth leaked-password protection before the final production rollout if the project plan supports it.

The final Auth Site URL / redirect allow-list should also point to the production Ranch Expense Tracker URL rather than a research or localhost URL.

## PWA / offline audit

The 1.5 service worker is still labeled 1.5.0 and describes records as device-local. It must be replaced for V2.

V2 service-worker requirements:

- New V2 cache namespace/version.
- Cache the V2 app shell after a successful online load.
- Keep network-first navigation so releases update normally.
- Preserve a cached application shell for offline use after the app has previously loaded.
- Ensure the Supabase browser client needed to open an existing authenticated offline session is available from cache, rather than depending on an uncached CDN request.
- Never cache Supabase API responses containing user data in the service-worker app-shell cache.

## Final release gates

Before replacing production 1.5.0 with 2.0.0:

1. Generate a clean V2 source file with no runtime research/hotfix scripts.
2. Static-search the V2 source for obsolete backup/history/reopen architecture.
3. JavaScript syntax check all V2 scripts.
4. Test account creation and email confirmation.
5. Test existing-account sign in.
6. Test name/department editing without account-gate flicker.
7. Test expense create/edit/delete on two devices.
8. Confirm submitted expenses cannot be edited/deleted.
9. Confirm submitted reports cannot be reopened/deleted.
10. Test saved-default add/remove sync.
11. Test current-report selection and completed-report sync.
12. Test sign out clears the V2 local user cache and sign in restores cloud data.
13. Test two-account isolation once more on the release candidate.
14. Test offline use after one successful online load.
15. Test optional V1-to-V2 migration on a copy of existing local data before using it on the two real legacy devices.
16. Update README, CHANGELOG, RELEASE_NOTES, USER_GUIDE, TECHNICAL_HANDOFF, manifest, service worker, and version metadata to 2.0.0.

## Production rule

Do not promote the Test 6 patch-loader page itself. Test 6 is the behavioral proof. Version 2.0 should integrate the approved behavior directly into clean production source.