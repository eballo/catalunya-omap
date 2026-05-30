## [2.1.2] - 2026-05-30
### Changed
- Improved test suite to reach 100% coverage across all source files (statements, branches, functions, lines)

## [2.1.1] - 2026-05-29
### Changed
- Webpack: add `BannerPlugin` to embed version number (`/*!  catalunya-omap vX.Y.Z */`) in compiled JS

## [2.1.0] - 2026-05-27
### Added
- `CLAUDE.md` with release checklist and development notes
- `scripts/deploy.js` for SFTP deployment (`npm run deploy`)
- CSS: `.cm-map-outer` / `.cm-map-container` wrapper classes for WordPress page embedding
- CSS: legend icons horizontally centred with flexbox (`ul.legend { display:flex; justify-content:center }`)
### Changed
- Monument builder refactored to use `BUILDING_TYPES` array pattern (replaces 15 individual `add*` methods)
- `window.cmOmapManager` now exposed before `create()` completes for reliable plugin/tab integration
- Default `listId` changed from `mapLlist` to `map-list`
- `SERVER_HOST` defaults to `''` in `.env.sample` so icon paths are relative for local dev
- `index.html`: new header design with version number visible on page
- Deleted unused `web/js/catalunya-omap-path.js`
### Fixed
- `handleSearchTextList`: null guard prevents crash when list element is absent
- Map tiles render correctly when opened from a collapsed tab (early `cmOmapManager` exposure + `resize()` retry)
- Tests updated to match refactored `BUILDING_TYPES` API (40 tests passing)

## [2.0.0]
- Reorganize image paths: `images/catalunya-gmap/gmap/{type}/{category}/` → `images/{type}/{category}/`
- Reorganize control images: `images/catalunya-gmap/gmap/0x.png` → `images/controls/0x.png`
- Reorganize logo: `images/catalunya-gmap/logo/` → `images/logo/`
- Support external configuration via `catalunyaOmapConfig` object (serverHost, secondaryDivId, listId, userPosition)
- Expose `window.cmOmapManager` for plugin/external integration
- Add `resetView()` method on MapManager
- New CSS: legend styles and flexbox layout for map container
- Webpack: add plugin build target (`buildPlugin`) and `PLUGIN_PATH` config
- Webpack: add TerserPlugin with `extractComments: false`
- Fix null check for search input element
- Simplify HTML structure

V1.0
- Migrate from GoogleMaps to leafletjs

- TODO:
  - add Tests
  - clean old code when all is working
  - document code 
  - review readme
  - github actions + pipeline
