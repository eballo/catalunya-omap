V2.0.0
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
