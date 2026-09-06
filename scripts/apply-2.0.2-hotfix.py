from pathlib import Path
import json
import re
import subprocess
import tempfile


def replace_exact(text, old, new, label, expected=1):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} match(es), found {count}")
    return text.replace(old, new, expected)


index_path = Path("index.html")
text = index_path.read_text(encoding="utf-8")

if text.count("2.0.1") < 4:
    raise SystemExit("Version bump guard: expected Version 2.0.1 references in index.html")
text = text.replace("2.0.1", "2.0.2")

startup_styles = '''  <style id="ranchStartupUpdateStyles">
    #ranchStartupUpdate{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:24px 18px calc(24px + env(safe-area-inset-bottom));background:radial-gradient(circle at 88% 4%,rgba(211,154,48,.18),transparent 30rem),linear-gradient(180deg,#fbf7ef 0%,#f5efe4 100%);color:#2a231e;text-align:center}
    #ranchStartupUpdate.ranch-startup-update-done{opacity:0;pointer-events:none;transition:opacity .16s ease}
    .ranch-startup-update-card{width:min(440px,100%);padding:28px 24px;border:1px solid #dfd1bd;border-radius:20px;background:#fffdf8;box-shadow:0 18px 46px rgba(74,50,30,.13)}
    .ranch-startup-update-spinner{width:38px;height:38px;margin:0 auto 15px;border:4px solid #eadfce;border-top-color:#a71f25;border-radius:50%;animation:ranchStartupSpin .8s linear infinite}
    .ranch-startup-update-card strong{display:block;font-size:1.16rem;margin-bottom:6px}.ranch-startup-update-card span{display:block;color:#766a60;line-height:1.45}.ranch-startup-update-card small{display:block;margin-top:13px;color:#8b7d71;font-weight:750}
    @keyframes ranchStartupSpin{to{transform:rotate(360deg)}}
  </style>
'''
text = replace_exact(
    text,
    '  <title>Ranch Expense Tracker - Version 2.0.2</title>\n  <style>',
    '  <title>Ranch Expense Tracker - Version 2.0.2</title>\n' + startup_styles + '  <style>',
    "startup update styles"
)

startup_markup = '''  <div id="ranchStartupUpdate" role="status" aria-live="polite" aria-label="Ranch Expense Tracker startup status">
    <div class="ranch-startup-update-card">
      <div class="ranch-startup-update-spinner" aria-hidden="true"></div>
      <strong id="ranchStartupUpdateMessage">Checking for updates…</strong>
      <span id="ranchStartupUpdateDetail">Making sure you have the latest Ranch Expense Tracker.</span>
      <small>Version 2.0.2</small>
    </div>
  </div>
  <script>
  (() => {
    const CURRENT_VERSION = "2.0.2";
    const MIN_VISIBLE_MS = 650;
    const started = Date.now();
    const overlay = document.getElementById("ranchStartupUpdate");
    const message = document.getElementById("ranchStartupUpdateMessage");
    const detail = document.getElementById("ranchStartupUpdateDetail");
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    window.__ranchStartupUpdaterV2 = true;

    const compareVersions = (left, right) => {
      const a = String(left || "").split(".").map(part => Number.parseInt(part, 10) || 0);
      const b = String(right || "").split(".").map(part => Number.parseInt(part, 10) || 0);
      const length = Math.max(a.length, b.length);
      for (let i = 0; i < length; i += 1) {
        const av = a[i] || 0;
        const bv = b[i] || 0;
        if (av !== bv) return av > bv ? 1 : -1;
      }
      return 0;
    };

    const finishStartupCheck = async () => {
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - started));
      if (remaining) await wait(remaining);
      overlay?.classList.add("ranch-startup-update-done");
      await wait(180);
      overlay?.remove();
      window.__ranchStartupUpdaterV2 = false;
      document.dispatchEvent(new Event("ranch-startup-ready"));
    };

    const reloadIntoLatest = async latestVersion => {
      if (message) message.textContent = "Updating Ranch Expense Tracker…";
      if (detail) detail.textContent = "A newer version is available. This should only take a moment.";

      const attemptKey = `ranch-update-attempts:${latestVersion}`;
      const attempts = (Number.parseInt(sessionStorage.getItem(attemptKey) || "0", 10) || 0) + 1;
      sessionStorage.setItem(attemptKey, String(attempts));

      try {
        if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
          const controllerChanged = new Promise(resolve => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
          });
          const registration = await navigator.serviceWorker.register("service-worker.js", {
            scope: "./",
            updateViaCache: "none"
          });
          await registration.update().catch(error => console.warn("Startup service-worker update check failed.", error));

          const requestActivation = worker => {
            if (!worker) return;
            if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
            else worker.addEventListener("statechange", () => {
              if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
            });
          };
          if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
          requestActivation(registration.installing);
          await Promise.race([controllerChanged, wait(3000)]);
        }
      } catch (error) {
        console.warn("Automatic Ranch Expense Tracker update failed; forcing a fresh navigation.", error);
      }

      if (attempts >= 3 && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration("./");
          if (registration) await registration.unregister();
        } catch (error) {
          console.warn("Could not reset the stale service worker.", error);
        }
      }

      const freshUrl = new URL(location.href);
      freshUrl.searchParams.set("_ranch_update", `${latestVersion}-${Date.now()}`);
      location.replace(freshUrl.toString());
    };

    (async () => {
      try {
        const cleanUrl = new URL(location.href);
        if (cleanUrl.searchParams.has("_ranch_update")) {
          cleanUrl.searchParams.delete("_ranch_update");
          history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        }

        const response = await fetch(`version.json?check=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Version check returned ${response.status}.`);
        const release = await response.json();
        const latestVersion = String(release?.version || "").trim();

        if (latestVersion && compareVersions(latestVersion, CURRENT_VERSION) > 0) {
          await reloadIntoLatest(latestVersion);
          return;
        }
        if (latestVersion === CURRENT_VERSION) {
          sessionStorage.removeItem(`ranch-update-attempts:${latestVersion}`);
        }
      } catch (error) {
        console.warn("Ranch Expense Tracker update check could not complete.", error);
        if (detail) detail.textContent = "Starting Ranch Expense Tracker.";
      }

      await finishStartupCheck();
    })();
  })();
  </script>
'''
text = replace_exact(text, "<body>\n", "<body>\n" + startup_markup, "startup update overlay")

text = replace_exact(
    text,
    '''      navigator.serviceWorker.addEventListener("controllerchange", () => {\n        // A new worker has taken control. Reload once so the employee sees the\n        // newly deployed application shell. This does not clear localStorage\n        // or IndexedDB expense/receipt data.\n        if (reloadingForServiceWorker) return;''',
    '''      navigator.serviceWorker.addEventListener("controllerchange", () => {\n        // The startup updater owns controller changes while it is actively\n        // checking/installing a release. Later background updates still reload once.\n        if (window.__ranchStartupUpdaterV2) return;\n        // A new worker has taken control. Reload once so the employee sees the\n        // newly deployed application shell. This does not clear localStorage\n        // or IndexedDB expense/receipt data.\n        if (reloadingForServiceWorker) return;''',
    "service worker controller handoff"
)

text = replace_exact(
    text,
    '<small>Personal business expense tracking</small>',
    '<small>Personal business expense tracking · Version 2.0.2</small>',
    "auth gate version label"
)
index_path.write_text(text, encoding="utf-8")

sw_path = Path("service-worker.js")
sw_text = sw_path.read_text(encoding="utf-8")
if sw_text.count("2.0.1") != 2:
    raise SystemExit(f"service-worker version guard expected 2 references, found {sw_text.count('2.0.1')}")
sw_path.write_text(sw_text.replace("2.0.1", "2.0.2"), encoding="utf-8")

version_path = Path("version.json")
version = json.loads(version_path.read_text(encoding="utf-8"))
if version.get("version") != "2.0.1":
    raise SystemExit(f"version.json guard expected 2.0.1, found {version.get('version')}")
version["version"] = "2.0.2"
version["release"] = "Cloud Sync Update Guard"
version["released"] = "2026-09-05"
version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")

readme = Path("README.md")
readme_text = readme.read_text(encoding="utf-8")
readme_text = replace_exact(
    readme_text,
    "Current release: **Version 2.0.1 — Cloud Sync Hotfix**",
    "Current release: **Version 2.0.2 — Cloud Sync Update Guard**",
    "README release line"
)
readme.write_text(readme_text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
changelog_text = changelog.read_text(encoding="utf-8")
notes = '''## 2.0.2 - September 5, 2026

### Fixed
- App startup now checks the uncached production release marker before exposing account controls.
- Employees see a short “Checking for updates…” screen and an “Updating Ranch Expense Tracker…” message when a newer release needs to be activated.
- New service workers are activated automatically and the app performs a fresh navigation so employees do not need to know the close-and-reopen PWA workaround.
- The sign-in/create-account gate now displays the running application version for easier troubleshooting.
- Offline startup remains available; a failed update check does not clear or block locally cached expense data.

'''
changelog_text = replace_exact(changelog_text, "# Changelog\n\n", "# Changelog\n\n" + notes, "CHANGELOG 2.0.2 notes")
changelog.write_text(changelog_text, encoding="utf-8")

release_notes = Path("RELEASE_NOTES.md")
release_text = release_notes.read_text(encoding="utf-8")
release_text = replace_exact(release_text, "# Release Notes - Version 2.0.1", "# Release Notes - Version 2.0.2", "release note title")
release_text = replace_exact(release_text, "**Release name:** Cloud Sync Hotfix", "**Release name:** Cloud Sync Update Guard", "release note name")
section = '''## Version 2.0.2 update guard
- Checks the live release marker before the employee reaches sign-in or account creation.
- Shows a simple startup status while checking and a clear update message when a new build is being activated.
- Automatically activates the newest service worker and reloads into the current production shell instead of requiring users to manually close and reopen the PWA.
- Displays the running version on the account gate for support/troubleshooting.
- Falls back safely when offline without deleting Version 1.x data or Version 2 local working data.

'''
release_text = replace_exact(release_text, "## Version 2.0.1 hotfix\n", section + "## Version 2.0.1 hotfix\n", "release note 2.0.2 section")
release_notes.write_text(release_text, encoding="utf-8")

# Validate JavaScript syntax before the workflow commits anything.
text = index_path.read_text(encoding="utf-8")
required = [
    "Ranch Expense Tracker - Version 2.0.2",
    "Checking for updates…",
    "Updating Ranch Expense Tracker…",
    'const CURRENT_VERSION = "2.0.2"',
    "window.__ranchStartupUpdaterV2",
    "Personal business expense tracking · Version 2.0.2"
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"Missing required 2.0.2 marker: {marker}")

scripts = re.findall(r'<script([^>]*)>(.*?)</script>', text, flags=re.S | re.I)
for i, (attrs, code) in enumerate(scripts):
    if not code.strip():
        continue
    suffix = ".mjs" if 'type="module"' in attrs or "type='module'" in attrs else ".js"
    with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, encoding="utf-8") as handle:
        handle.write(code)
        temp_name = handle.name
    result = subprocess.run(["node", "--check", temp_name], capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"Inline script {i} failed syntax validation:\n{result.stderr}")

result = subprocess.run(["node", "--check", "service-worker.js"], capture_output=True, text=True)
if result.returncode != 0:
    raise SystemExit(result.stderr)

if json.loads(version_path.read_text(encoding="utf-8")).get("version") != "2.0.2":
    raise SystemExit("version.json was not bumped to 2.0.2")
if "ranch-expense-tracker-v2-2.0.2" not in sw_path.read_text(encoding="utf-8"):
    raise SystemExit("service-worker cache namespace was not bumped to 2.0.2")

# One-time patch helpers are removed from the finished branch commit.
for helper in [
    Path("scripts/apply-2.0.2-hotfix.py"),
    Path(".github/workflows/apply-2.0.2-startup-update.yml")
]:
    if helper.exists():
        helper.unlink()
