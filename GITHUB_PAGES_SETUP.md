# GitHub Pages Setup

Upload the files inside this folder directly to the root of the `personal-expense-tracker` repository.

The repository root must contain:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `service-worker.js`
- `.nojekyll`
- `icons/`

Then open **Settings → Pages** and choose:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

The expected site address is:

`https://redpanda-17.github.io/personal-expense-tracker/`

Do not rename `CHANGELOG.md` or any other document to `index.html`. The correct `index.html` begins with `<!DOCTYPE html>` and is approximately 22 KB.
