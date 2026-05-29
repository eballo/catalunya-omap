# CLAUDE.md — Catalunya OMap

## Release checklist

Each time a new release is prepared, perform **all** of the following steps in order:

### 1. Determine the new version number
- **Major** (`X.0.0`): breaking changes (renamed config keys, removed public API, changed data contract).
- **Minor** (`X.Y.0`): new backwards-compatible features.
- **Patch** (`X.Y.Z`): bug fixes only.

### 2. Update version in package files
- `package.json` → `"version"` field.
- `package-lock.json` → top-level `"version"` field **and** the inner `packages[""].version` field (two occurrences, use replace_all).

### 3. Update `changelog.md`
Add a new entry at the top (below the `# Changelog` heading) using this format:

```
## [X.Y.Z] - YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Fixed
- ...
### Removed
- ...
```

Only include sections that have entries. Use today's date.

### 4. Update `demo.md`
Add a new entry at the bottom of the list following the existing pattern:
`- [Demo vX.Y.Z](http://demo.catalunyamedieval.es/omapXYZ)`

The deploy script uses the same logic:
- `2.0.0` → `omap2`   (minor=0, patch=0)
- `2.1.0` → `omap21`  (patch=0)
- `2.1.1` → `omap211` (patch≠0)

### 5. Update version string in `web/index.html`
The `<title>` and `<h1>` tags contain the version (e.g. `Demo v2.0`). Update them to match the new version.

### 6. Take a screenshot
- Start the dev server on port 9090 (port 9000 is used by PhpStorm): `npm run start -- --port 9090 &`
- Capture the live map using Playwright (inject `window.catalunyaOmapConfig = { markersJsonUrl: 'js/catalunya-markers.json', serverHost: 'http://localhost:9090/' }` as an init script so the map renders).
- Save the screenshot as `screenshot/screenshot-vX.Y.png` (e.g. `screenshot-v2.0.png`).
- **Stop the server** after the screenshot: `kill $(lsof -ti :9090)` — leaving it running blocks the port for future sessions.

### 7. Update `README.md` screenshot
Update the screenshot image reference to point to the new version:
```
<img src="https://github.com/eballo/catalunya-omap/blob/main/screenshot/screenshot-vX.Y.png" .../>
```

### 8. Deploy
Assegura't que `.env.demo` té `SFTP_REMOTE_PATH` apuntant al directori **base** (sense versió, e.g. `/home/user/www/demo`).
El script calcula el subdirectori automàticament: v2.1.0 → `omap21`, v3.0.0 → `omap3`.
```bash
npm run deploy
```
El deploy script fa el `buildDemo` internament — no cal fer `buildProd` manualment.

---

## Development notes

- The webpack dev server default port (9000) conflicts with PhpStorm's Xdebug listener. Use port 9090 instead.
- `markersJsonUrl` and `serverHost` must be provided by the host page via `window.catalunyaOmapConfig`; they default to `''`.
- For local dev set `SERVER_HOST=''` in `.env` so icon paths are relative and work on any port.
- `buildPlugin` compiles JS + minifies CSS and copies both to `catalunya-medieval-plugins` automatically.
- Playwright is available via `npx playwright`; the chromium binary is cached at `~/.npm/_npx/`.
