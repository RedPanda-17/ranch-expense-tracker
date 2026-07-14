# GitHub Pages Setup

## Required repository layout

These files must appear immediately when you open the repository:

- `.nojekyll`
- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `404.html`
- `COPYRIGHT.md`
- `icons/`

`app.js` and `styles.css` are included as readable source copies, but the deployed `index.html` does not depend on them.

## Publish settings

1. Open **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main`.
4. Set **Folder** to `/(root)`.
5. Save.

## Verify the correct index file

Open `index.html` in GitHub. It should:

- Begin with `<!DOCTYPE html>`
- Be larger than 100 KB
- Contain `Ranch Expense Tracker`
- Not begin with `# Changelog`

## Lowest-risk replacement

1. Delete the current incorrect `index.html` and commit the deletion.
2. Upload only the `index.html` from this package and commit it.
3. Open the Pages link in a private/incognito window.
4. Once the app appears, upload the remaining package files.

## Page address

`https://redpanda-17.github.io/personal-expense-tracker/`
