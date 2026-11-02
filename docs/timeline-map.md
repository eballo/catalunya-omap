# Timeline map

A map with a century slider: buildings appear as time moves forward. Lives on its own new page of the site.

## Decisions (31/10/2026)

- **A building appears at its first century and stays.** Appearance = the lowest century in its `segle` field. It is never hidden again as time advances.
- **A new, dedicated page** (theme template), not the home page or an existing listing.
- The engine is an **omap mode** (`timeline: true` in `window.catalunyaOmapConfig`), so the page stays a thin host. The page template only prints the container and the config.
- Every omap change is ported to **gmap** in the same batch (never run gmap's `buildPlugin`).
- Buildings without a century are **not animated**. The page shows a discreet counter ("3,160 of 3,554 dated") and the count grows as content is completed.

## Starting point

- The `segle` meta (Roman numerals, comma separated, e.g. `XI,XII`) already exists (`CmBuildingFields::FIELDS`). Local copy: 3,160 of 3,554 published buildings have it. Most frequent: XII (798), XI (693), XIII (347), XIV (276), XVI (250). A few I–IX and XX.
- The markers JSON (`MarkersMapService::collect_markers()`) does **not** carry the century yet.
- More centuries will be filled in soon: the design must work with partial data and improve by itself as data arrives.

## Phases

### 1. Data (`catalunya-medieval-plugins`)

- Add `segleIni` (and `segleFi`) to each marker as integers (XI -> 11), derived from `segle`.
- Tolerant parser: `XI,XII`, spaces, lowercase, empty and odd values are ignored without failing.
- PHPUnit test for the parser.
- Check the JSON size impact (two ints per marker, expected negligible).

### 2. Engine (`catalunya-omap`)

- New module `src/app/catalunya-omap-timeline.js`: no jQuery, no globals.
- Pure function `visibleAt(markers, century)` (first century <= selected), Jest tests.
- Control under the map: century slider (range taken from the data), play/pause, speed, step buttons.
- Add/remove markers incrementally with a soft fade; do not rebuild the whole layer on every step (~3,000 points, watch performance).
- Live counter: "Segle XII · 1,491 buildings".
- Accessibility: keyboard-operable slider, polite `aria-live`, `prefers-reduced-motion` disables autoplay.
- Mobile: compact control at the bottom.
- Port the same change to gmap.

### 3. Page (theme `catalunyamedieval`)

- New page template with the timeline map and the counter of dated buildings.
- Combine with the existing filters (type, comarca) if cheap; otherwise leave for later.
- Where to link it from (menu, home) is **open**: do not redesign the home.

### 4. Tests, release, demo

- Integration test in `catalunya-medieval-integration-tests` (slider present, marker count changes when moved), as its own PR paired with the code PR. Run it against the old code to see it fail.
- Regenerate the plugin's dist CSS/JS after updating the omap bundle and commit it before the PR (CI checks dist is current).
- CI release, Playwright screenshot, `make deploy-demo` from `catalunya-medieval-ops` (dry run first; ask before the real one).

## PR order

1. Plugin: data + parser + test.
2. omap: module + Jest tests.
3. gmap: same change.
4. Plugin: new omap bundle + dist.
5. Theme: new page.
6. Integration tests.

Steps 1 and 2 are enough to try it locally before the rest.

## Open questions

- Menu/home entry point for the page.
- Final page title and slug (Catalan, e.g. "Línia del temps").
- Whether `segleFi` is needed at all with the "stays" rule (kept for a possible later mode where buildings fade out).
