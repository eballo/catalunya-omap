# Timeline map — «Segle a segle»

A map with a century slider: buildings appear as time moves forward, and the visitor can restrict it to one or
more historical periods. Lives on its own page of the site (`/segle-a-segle/`).

Status (2/11/2026): code merged and released everywhere; the demo is live
(`https://demo.catalunyamedieval.es/omap/?timeline=1`). Production still needs the plugin and the theme to be
updated and the page to be created (see *Post-merge*).

## Decisions

- **A building appears at its first century and stays** (31/10/2026). Appearance = the lowest century in its
  `segle` field (`segleIni`). It is never hidden again as time advances.
- **A new, dedicated page** (theme template), not the home page or an existing listing.
- The engine is an **omap mode** (`timeline: true` in `window.catalunyaOmapConfig`), so the page stays a thin host.
- Every omap change is ported to **gmap** in the same batch (never run gmap's `buildPlugin`).
- Buildings without a century are **not painted**. The control shows a discreet counter («3.160 de 3.554
  edificis amb segle») that grows as content is completed.
- **Name: «Segle a segle»** (2/11/2026). «Neix Catalunya» was kept as a possible tagline.
- **Periods** (2/11/2026). Every century belongs to one period only; the border centuries go to the later one:

  | Period | Centuries |
  |---|---|
  | Època romana | I–IV |
  | Alta edat mitjana | V–X |
  | Plena edat mitjana | XI–XIII |
  | Baixa edat mitjana | XIV–XV |
  | Època moderna | XVI–XVIII |
  | Època contemporània | XIX–XXI |

  «Plena edat mitjana» (not «ple medieval») is the standard Catalan term. The bands are cut to the range of the data.
- **Periods are a filter, not a jump** (2/11/2026). Each band is a toggle, several can be chosen, «Totes» clears
  the choice. With a choice only the buildings whose first century falls in the chosen periods are painted, so
  «Alta + Baixa» shows no Plena edat mitjana and no Època romana. Choosing shows the whole choice at once; the
  slider, the steps and play then run only through the chosen centuries and skip the gaps. With nothing chosen the
  timeline is the cumulative one.

## How it works

- **Data** (`catalunya-medieval-plugins`): each marker carries `segleIni` and `segleFi` (integers, XI → 11),
  derived from the `segle` meta by `CmCenturyParser` (tolerant: spaces, lowercase, ranges, odd or empty values are
  skipped). A marker without a valid century has neither key. Local copy: 3,160 of 3,554 buildings are dated.
- **Engine** (`src/app/catalunya-omap-timeline.js`, ported to gmap): pure helpers (`toRoman`, `centuryRange`,
  `inEras`, `eraCenturies`, `visibleAt`, `ERAS`) and `TimelineControl` (slider, step, play/pause, 1×/2×/4× speed,
  period bands). Markers are added and removed in batches, only those that change at each step.
  The manager keeps a `timelineFilter` so switching a category on or off respects the century.
- **Animation:** in omap new buildings sprout like mushrooms (CSS `scale` from their foot, with a bounce and a random
  delay, only on the icons added by the step); in gmap Google's own `Animation.DROP`.
  `prefers-reduced-motion` turns the animation and autoplay off.
- **Accessibility:** keyboard-operable slider and buttons, polite `aria-live` status, `aria-pressed` on the period
  buttons, `aria-current` on the period of the current century.
- **Page** (theme `catalunyamedieval`, `page-templates/pageTimeline.php`): intro plus the map, fed by the same
  nonce'd markers endpoint as the other map pages, with `timeline: true` and `foldLayers: true`.
- **Demo:** the `web/` page takes `?timeline=1` (a «Segle a segle» button in its feature bar). Its markers JSON
  carries the century fields.

## Tests

- Jest in omap and gmap (helpers, the control's logic, and for gmap a jsdom test of the real control).
- Integration (`catalunya-medieval-integration-tests`, `tests/content/test_timeline_page.py`): control present,
  buildings appear and never disappear along the timeline, a chosen period shows fewer buildings than the
  accumulated one, several periods add up, «Totes» goes back. Skips where the page does not exist.

## Releases

| Piece | PR |
|---|---|
| Century data in the markers | plugins #67 |
| Timeline mode | omap #61, gmap #80 |
| Periods | omap #62 |
| Period filter | omap #63, gmap #81 |
| Bundle in the plugin | plugins #68, #69 |
| Page | theme #191 |
| Tests | integration-tests #185, #186 |

## Post-merge (production)

1. Update the plugin, then the theme (Dashboard → Updates).
2. Create the page «Segle a segle» (slug `segle-a-segle`) with the template «Segle a segle».
3. The next map refresh writes the century fields into the production markers.

## Open

- Where to link the page from (menu, home): **open**, do not redesign the home.
- gmap was never seen running in a browser (the local Google Maps key is expired and the demo key is bound to its
  own domain): renew the key, then `make deploy-demo ONLY=gmap`.
- Combine with the existing filters (type, comarca) if cheap.
- `segleFi` is carried but unused with the «stays» rule (kept for a possible mode where buildings fade out).
- Start the slider at a later century than I (the first ones hold a handful of buildings)?
