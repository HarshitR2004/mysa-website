# Mysa frontend performance study

An unofficial internship portfolio project: Mysa's current marketing design rebuilt as static Astro pages, with original brand assets and a smaller browser runtime. Mysa owns its brand and content. This repository is not an official Mysa property.

## Run

Use **Node 24 LTS** (or Node >=22.23.4), npm >=9.6.5, and Chromium for verification. The system Node 22.17 is too old for the pinned Astro release.

```sh
npm ci
npm run dev
```

The development URL is printed by Astro. For the production version and controlled comparison:

```sh
npm run build
npm run serve:study
```

Open **http://127.0.0.1:4321/**. The frozen original is **http://127.0.0.1:4321/reference/**; project disclosure is **/project-info**. The study server binds to localhost. It serves gzip, byte ranges for videos, and a restrictive CSP. `npm run preview` is also available for viewing only the optimized build.

On this machine Node 24 is bundled at `C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`. The Astro and benchmark npm commands automatically use that runtime if the default Node is too old. Other machines should install Node 24 LTS. Test scripts detect the available Chromium install; set `CHROME_PATH` to override, or install one using `npx playwright install chromium`.

## Included pages

43 marketing routes, plus a project-information page. `src/data/routes.json` is the explicit route manifest; `src/data/pages.json` contains page metadata and is exposed through an Astro content collection. The scope includes product/platform pages, four industry solutions, seven integrations, team/event pages, legal pages, booking, three resource listings, the customer listing and 13 customer stories. Blog pagination uses 104 frozen cards; the customer listing uses 13 cards. Resource detail pages and tools open official Mysa destinations.

## Source organization

- `src/components/pages/`: editable, route-specific Astro sections, ported from the frozen presentation. No generic substitute layouts.
- `src/components/shared/`: shared navigation, footer, banner and modal variants. Original class names preserve the reference CSS and layout.
- `src/scripts/`: navigation, media, forms, tabs, FAQ, carousels, resource filtering, counters, and pointer artwork behavior.
- `public/styles/`: local reference styles, extracted page styles and local fonts. `src/styles/enhancements.css` contains behavior/accessibility additions.
- `public/assets/`: locally served visual assets and optimized derivatives. `src/data/assets.json` maps original URLs to local filenames; `optimized.json` maps replacements; dimensions are recorded separately.
- `reference/`: original HTML, styles/runtime assets, sitemap, capture metadata, computed style samples and screenshots. These files are outside the production output.
- `reports/`: verification, screenshots, Lighthouse results, network captures and the case study.

The design was ported into static Astro components using the existing presentation markup/CSS, rather than guessing the layout. Vendor scripts, trackers and live submission handlers are removed from the optimized runtime. There is no production scraper or iframe mirroring Mysa.

## Behavior and service boundaries

Navigation, responsive menus, dropdowns, FAQ, tabs, carousels, video dialogs and local forms work without a backend. Inputs remain in the current document's memory; no cookies or local/session storage hold form entries. The homepage email qualifier opens a local form modal instead of transferring the email to another page or a real booking system. Valid submission explicitly explains that nothing was sent and no appointment was booked. The prototype does not call CRM, Zapier, authentication, analytics, tracking or booking endpoints.

External login/social/download links retain official destinations. A YouTube privacy-enhanced embed is created only after a visitor requests playback. Background video source selection follows the rendered breakpoint; offscreen videos pause. Reduced motion stops optional motion and autoplay. All prototype pages carry `noindex,nofollow`.

## Verification

With the production study server running:

```sh
npm run check
npm test
npm run benchmark
```

`npm test` checks 43 routes, HTTP errors, unexpected external requests, images, local destinations, desktop/mobile reflow, screenshots at 390/768/1440/1920, 320px reflow and core interaction flows. It forces image loading only for visual captures; the benchmark never does. The 720px reflow test approximates the CSS viewport at 200% zoom on a 1440px screen; it is not a physical browser-zoom or screen-reader certification.

`npm run benchmark` runs **five sequential Lighthouse desktop audits per variant**: frozen local reference, local optimized build, and the official live homepage. Do not run other browser tests concurrently. Existing raw reports are reused; move that report set to a new dated folder before collecting a fresh set after code changes. `RUNS` and `BENCH_VARIANT` allow focused diagnostic runs, which must not be presented as the five-run final study.

The two local versions use the same origin, gzip server and CSP blocking production services; their rendering/runtime differ. The official live comparison has a different CDN/network path and retains production integrations. The report must disclose those differences. The local reference additionally loads the same local Inter font stylesheet, rather than depending on Google's dynamic font API.

The delivered study contains **3 valid local-reference, 5 optimized, and 4 live Lighthouse runs**. Two reference traces lacked LCP metrics, and the original long-running runner exhausted its trace-processing memory on the final live attempt. Extended retries were stopped at the user's request. Raw failures are retained and excluded from medians. The benchmark command now isolates each audit in its own Node worker; that revised runner was syntax-checked, not used for another extended audit series.

Targets are desktop score >=90, LCP <=2.5s, TBT <=200ms, CLS <=0.1, homepage DOM <3,000, and >=40% less initial transferred data. These are goals, not guaranteed claims. Read `reports/performance/summary.json` and `reports/CASE_STUDY.md` for actual observations and limitations.

## Reference authoring tools

The reference is frozen to 26 October 2026. `scripts/freeze.py`, `optimize.mjs`, `compose.py`, `prepare-reference.py`, `collections.py`, `fonts.py`, `image-dimensions.mjs` and `separate-reference.mjs` document the original capture/porting process. Python authoring tools use BeautifulSoup and fontTools; Node image tools use sharp. They are **not** part of the normal development/build path. Do not blindly regenerate over hand-reviewed Astro sections. `npm run capture` captures the official site again and therefore changes the visual baseline; use it intentionally.

## Hosting

`dist/` is a static build suitable for any static host with extensionless HTML routing. Configure `/accounts-payable` to serve `/accounts-payable.html`, nested routes likewise, and gzip/Brotli for text files. Keep `reference/` private and outside production. No public deployment or production system integration is performed by this project.
