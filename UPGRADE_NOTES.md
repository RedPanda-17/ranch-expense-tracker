# Upgrade Notes - 1.3.4 to 1.4.0

## Repository update

Replace the hosted source files in one commit. Keep the GitHub Pages repository name and URL unchanged.

Recommended commit message:

`Release Ranch Expense Tracker v1.4.0`

## Browser data

Version 1.4.0 uses the same production localStorage keys and IndexedDB database as Version 1.3.4. Existing data should remain available at the same GitHub Pages origin.

Before deployment:

1. Download a backup from the current live version.
2. Upload the Version 1.4.0 hosted files.
3. Wait for GitHub Pages deployment.
4. Hard refresh the live page.
5. Confirm the footer says Version 1.4.0.
6. Confirm existing test expenses are still present.
7. Test PDF, CSV, backup, and restore.

## Installed web apps

The service-worker cache name changes to `ranch-expense-tracker-v1.4.0`. Installed copies should update after the browser retrieves the new service worker. Close and reopen the installed app if the old version remains visible.
