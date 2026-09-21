# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static Jekyll 3 site (minima theme) serving interactive Leaflet maps of HIV prevalence,
viraemia, and viral load suppression across Malawi's 28 districts, for the RESPOND project.
Deployed to GitHub Pages from the `feature/jekyll` branch (the default branch) via
`.github/workflows/jekyll.yml`. There is no test suite and no linter.

## Commands

```bash
bundle install          # first time only; gems are locked to github-pages ~> 232
make build              # bundle exec jekyll build  -> _site/
make serve              # bundle exec jekyll serve  -> http://127.0.0.1:4000/mwi-hiv-maps-staging/
```

CI builds with `JEKYLL_ENV=production` and `--baseurl` set from the Pages config, and
`_config.yml` sets the same `baseurl: /mwi-hiv-maps-staging` so `make serve` serves at
`http://127.0.0.1:4000/mwi-hiv-maps-staging/`. All asset and page links must go through
`relative_url` or be relative (`./data/...`). Absolute `/` paths will break on Pages.

## Architecture

### Two kinds of source: templates vs. generated data

- **Templates and JS** (`_layouts/`, `_includes/`, `assets/`) are hand-written and are
  what you normally edit.
- **`data/`** is generated upstream by an R pipeline (see below) and committed as-is. Do
  not hand-edit it. `data/<District>.js` (~2 MB each) declares two globals, `viz_options`
  and `boundaries`; `data/national.js` declares `national` and `districts`.
  `data/<District>_tas.html` and `data/<District>_facilities.html` are self-contained
  reactable widgets embedded as iframes.

### Upstream: where `data/` comes from

Everything in `data/` is produced by the `split_model_results` orderly task in the sibling
repo `../respond-map-prep/` (`src/split_model_results/split_model_results.R`). That repo
has its own `.claude/CLAUDE.md` describing the full pipeline
(`h3_setup → assign_catchments → split_model_results`). Run it from R inside that repo:

```r
orderly::orderly_run("split_model_results")
```

Outputs land in `../respond-map-prep/archive/split_model_results/<timestamp-id>/artefacts/`.
Publishing is a manual copy of `national.js`, `<District>.js`, `<District>_tas.html`, and
`<District>_facilities.html` from that folder into this repo's `data/`, then a commit. The
`*_tas.csv`, `*_facilities.csv`, and `aggregate_summary_table.csv` artefacts are not used
here. There is no script for the copy step.

Things the R script decides that this site's JS depends on:

- **Column abbreviation.** Model columns `prev15to49_mean` etc. are renamed to
  `pr_m`/`vr_m`/`vl_m` (+ `_l`/`_u`) and rounded to 3 dp; populations are rounded to
  integers; coordinates are truncated to `OUTPUT_PRECISION = 1e4`.
- **Aggregation suffixes.** `_ta` comes from pre-aggregated area estimates; `_gvh`,
  `_facility`, `_scf` are population-weighted means of H3 cells computed in the script.
  Adding a new resolution level means adding an entry to `aggregation_metadata` there
  and a matching layer in `create_district_map()` here.
- **Per-district `viz_options`.** `settings_from_cutoffs()` sets `lower`/`upper`/
  `legend_breaks` from the observed range of H3 means, and `pop_cutoff_high` from the 90th
  percentile of H3 `pop_15to49`. `pop_cutoff_low`, palettes, and titles are not emitted
  and fall through to `default_viz_options` in `assets/js/viz_defaults.js`.
- **Reactable post-processing.** The script injects the Nunito Sans `<style>` block and
  zeroes widget padding so the iframes match `assets/main.scss`; font changes must be
  made in both places.
- **File naming.** `name_to_url()` replaces spaces with hyphens; current district names
  contain none, so file stems equal the collection stub titles (e.g. `Nkhatabay`).
- **Model year** is pinned by `MODEL_RESULTS_YEAR` (currently 2023).

Re-running the task produces byte-level diffs in every file even when the data are
unchanged (GeoJSON `"name": "file<hex>"` from `tempfile()`, and htmlwidget element ids).
Do not read such diffs as data changes.

The sibling repo also contains a `build_website` task and README notes about a
blogdown/Hugo site and a `RESPOND` public repo. That is the legacy publishing path and
is not used by this Jekyll site.

### Page generation: one stub per district per collection

Four Jekyll collections each contain one near-empty `<District>.md` stub whose only
content is front matter (`layout` + `title`). The layout does all the work and uses
`page.title` to pick the matching `data/<District>.js`. Permalinks in `_config.yml`:

| Collection          | Layout               | URL                          | Content                                     |
|---------------------|----------------------|------------------------------|---------------------------------------------|
| `_districts`        | `district.html`      | `/<District>.html`           | Full page: 3 maps + 2 iframe tables         |
| `_district_maps`    | `district_map.html`  | `/maps/<District>/`          | Full-screen viraemia map only (iframe-able) |
| `_prevalence_maps`  | `prevalence_map.html`| `/prevalence/<District>/`    | Full-screen prevalence map only             |
| `_vls_maps`         | `vls_map.html`       | `/vls/<District>/`           | Full-screen VLS map only                    |

`index.markdown` (layout `home`) and `national_map.markdown` (layout `national_map`)
render the national choropleth; the home layout also lists `site.districts`.

Adding a district means adding one stub to each of the four collections plus the three
`data/` files. The header dropdown and home list populate automatically from
`site.districts`, linking via `district_page.url | relative_url` so they work from nested
pages such as `/about/`.

### JS layering

Every map page loads scripts in this order, all as plain globals (no modules, no bundler):

1. `assets/js/leaflet_functions.js` — shared library: `create_district_map()`,
   `new_geojson()`, `prepare_legend()`, tooltip/popup builders, basemap helpers,
   `lazy_layer_group()`.
2. `assets/js/viz_defaults.js` — `default_viz_options` (palettes, breaks, titles per
   indicator) plus the `if(typeof viz_options === 'undefined') var viz_options = {}`
   guard, which exists because the data file may or may not define `viz_options`.
3. `data/<District>.js` — sets `viz_options` (per-district colour breaks) and `boundaries`.
4. Inline `const district_name = "..."`.
5. One `build_*.js` entry script that merges `default_viz_options[indicator]` with the
   district's `viz_options[indicator]` and calls `create_district_map(div_id, boundaries, opts)`.

The national map (`build_national_map.js`) does not load `viz_defaults.js`; it carries its
own flat `viz_options`.

Leaflet 1.9.4, MapLibre GL 5.x, the `@maplibre/maplibre-gl-leaflet` plugin, chroma.js
2.4.2 and the Nunito Sans font are loaded from unpkg / Google Fonts in
`_includes/head.html`, all version-pinned.

### Basemap

`add_basemap(map)` in `leaflet_functions.js` fetches the OpenFreeMap Positron style JSON
once per page and splits it into two MapLibre GL layers: a **base** (land, water,
buildings, minor roads) in `tilePane`, and an **overlay** (all label layers, admin
boundaries, major roads and railways) in a custom `basemapLabels` pane at z-index 450,
between the data polygons in `overlayPane` (400) and `shadowPane` (500).
`is_overlay_style_layer()` decides which style layers go where. Pass
`{labels_above: false}` to draw a single base layer beneath the data instead.

Pointer events: the `basemapLabels` pane and every GL canvas are `pointer-events: none`
(set in `add_basemap()` and in `assets/leaflet-styles.css`). Without this, the pane above
the data swallows hover and tooltips stop working. Never put the overlay in `shadowPane`
or any pane that keeps pointer events.

Fallback: `webgl_available()` is checked first; if WebGL is missing, or the style fetch
fails, `add_raster_fallback()` adds plain OpenStreetMap raster tiles beneath the data
(no labels overlay) and logs a console warning. A browser without WebGL therefore shows a
different basemap; when verifying visually, confirm the console has no such warning.

Attribution is "OpenFreeMap © OpenMapTiles, data © OpenStreetMap", passed via the
plugin's `attributionControl.customAttribution` option on the base layer only.

### Rendering and lazy layers

District maps use Leaflet's canvas renderer (`preferCanvas: true`). Only the "High
resolution" H3 layer is built at load; the other resolutions are `lazy_layer_group()`
instances that parse their GeoJSON the first time they are selected in the layer control.

### Data contract expected by `create_district_map()`

`boundaries` keys: `district`, `h3`, `gvh`, `ta`, `facility_catchments`,
`facility_points`, and optionally `survey_facilities` and `dropped_facility_points`.
Indicator columns are `<ind>_<stat><suffix>` where `ind` ∈ `pr` (prevalence), `vr`
(viraemia), `vl` (VLS); `stat` ∈ `m`/`l`/`u` (mean, lower, upper); and `suffix` is
`''` (native resolution), `_gvh`, `_ta`, `_facility`, or `_scf`. The toggleable
"resolution" layers are all drawn from the `h3` grid recoloured by a different suffix,
with the coarser polygon layer added as a non-filled overlay for outlines. Fill opacity
is stepped by `pop_15to49` against `pop_cutoff_low`/`pop_cutoff_high`, and tooltips
censor indicators where population is under 50.

### Styling

`assets/main.scss` sets minima's Sass variables (`$base-font-family`, `$text-color`,
`$content-width`) *before* `@import "minima"`, then adds the site chrome: `#990005` banner
and footer with white text, sticky header, district dropdown. Do not reintroduce blanket
`!important` rules; the earlier `* { color: inherit !important }` reset is what made the
banner text unreadable. `assets/leaflet-styles.css` holds the `.leaflet-map` sizing, the
`.full-screen` class used by the iframe-able layouts, and the pointer-events rule for the
GL canvases and the `basemapLabels` pane. The iframe tables are auto-resized by
`iframe_loaded()` in `head.html`. The footer text comes from `description` in
`_config.yml` plus the coat-of-arms credit hard-coded in `_includes/footer.html`.

The banner logo is `assets/images/mwi_coat_of_arms.svg` (Wikimedia Commons, CC BY-SA 3.0,
credited in `_includes/footer.html`). Keep it an SVG: `*.png` is routed through Git LFS by
`.gitattributes`, and the Pages checkout does not fetch LFS objects.

## Conventions

- Line length 90 in JS and comments; section-divider comments end in `---->`.
- `*.png`, `*.pdf`, `*.tif` are tracked with Git LFS (see `.gitattributes`).
- `_site/` is build output and gitignored; never edit it.
