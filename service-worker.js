# Ranch Expense Tracker v1.1.0 — Accountant Edition

A local-first expense, mileage, receipt, reimbursement-report, and backup tool.

## GitHub Pages deployment

This package is prepared for:

`https://redpanda-17.github.io/personal-expense-tracker/`

The deployment `index.html` is self-contained: its CSS and JavaScript are bundled inside the file. This prevents missing or mismatched `app.js` and `styles.css` files from stopping the site from loading.

Upload all files at the repository root and publish from `main` / `/(root)`. The first line of `index.html` must be `<!DOCTYPE html>`.

## Local data

Expenses, reports, settings, and receipts remain in browser storage for the exact website address. Create a backup before changing hosting providers or clearing browser data.

## Copyright

Copyright © 2026 Saul Garcia. All Rights Reserved. No open-source license is granted. See `COPYRIGHT.md`.

## Release scope

See `CHANGELOG.md` for Version 1.1.0 changes.
