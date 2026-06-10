# Session Context: Italy in 10

## Goal
Build Italy in 10 as a clean, extensible template app — copy for Portugal, France, Greece, Spanish Islands next.

## Architecture
- Single `app.js` reads `italy.json` dynamically → generates all HTML (zero static HTML files)
- 10 cities, 5 journeys, gradient city cards, Italian flag colors
- PWA, Sarah overlay, FAB, back-to-journey navigation, testimonials, footer
- Sarah core files (`sarah-core.js`, CSS, FAB, avatar) are country-agnostic — copy unchanged

## Key Files
- `app.js` — Express server (~88: hotel booking link with search-results fallback)
- `data/italy.json` — Raw Italy data (90 hotels, expanded airport/attractionPrices/dayTrips)
- `data/add-booking-links.js` — Script adding `bookingLink` to all hotels
- `generate-italy-data.js` — Builds `public/sarah/data/italy.js` and `database.js` from italy.json
- `public/sarah/sarah-core.js` — CANONICAL source (brain of Sarah Advisor)
- `public/sarah/sarah-ui.css` — CANONICAL source (styling)
- `dist/italy/sarah/` — Build copy (must mirror public/sarah/)
- `engine/public/sarah/` — Engine copy (must mirror public/sarah/)

## Progress

### Done (all sessions)
- Italy app fully built: 10 cities, 5 journeys, gradient cards, Italian colors
- All static HTML files deleted from `dist/italy/` and `engine/templates/`
- PWA, Sarah overlay, FAB, back-to-journey navigation, testimonials, footer complete
- Hotel booking links infrastructure: `app.js` line 88 checks `h.bookingLink` with search-results fallback
- `add-booking-links.js` written — maps all 90 hotels to Booking.com slugs
- Verified correct slugs: `generator-rome`, `de-russie`, `helvetia-bristol`, `villa-flori`, `artemide`, `hotelcolosseum`, `nerva`, `the-romehello`, `stregisgrandroma`, `le-sirenuse`
- Fixed wrong slugs: `four-seasons-firenze`, `camariaadelevanezia`, `armani-milano`, `albergoterminuscomo`, `villa-d-este`, `hoteldanielivenice`, `grandhoteltremezzopalace`
- All 90 hotels enriched with: vibe, area, proximity, realistic price ranges
- All 9 remaining cities researched → `/research/*.md`
- Expanded data (airport, attractionPrices, dayTrips) imported into `italy.json`
- Premium content moved to Sarah — free page stripped (shows basic transport, 3 restaurants, teaser, CTA)
- CTA: "skip 20 hours of Googling — Sarah knows this city inside out"
- All Spanish mis-references in sarah-core.js fixed (sun, phrases link, system prompt)
- Quiz **Next** bolded with `<strong>Next</strong>` on buttons AND instruction text
- Instruction text: "Pick your vibe and tap **Next**" across all steps
- Next button styled Italian green `#009246` + red underline `#ce2b37`
- Premium data added: secretSpots (3 hidden gems/city), budget (daily estimates), rainyPlan (backup)
- Restaurant booking: TheFork → Google Maps search (`maps/search/?api=1&query=Name+City+Italy`)
- `italy.js` and `database.js` regenerated with premium fields + Google Maps bookLinks
- Sarah system prompt injects premium data (budget, secret spots, rainy plan, booking links)
- Itinerary stops show "📍 Find on Maps" button when `bookLink` present
- Free restaurants dropped 5→3 to create teaser for Sarah
- Cache-busters on CSS (`?v=3`) and JS (`?v=4`)
- **Today (10 Jun)**: All 3 sarah-core.js copies fully de-Spain'd — defaults, city vibes, TheFork refs, Tapas label, Spanish fallback text
- **Today**: `package.json`, `public/manifest.json`, `public/.well-known/assetlinks.json` updated from Spain → Italy
- **Today**: `engine/server.js` fixed — wrong email, es-ES fallback, Spanish embassy contacts → Italian
- **Today**: Cache-busters bumped (core.js `v5`, ui.css `v4`, fab.css `v1`)
- **Today**: `dist/italy/sarah/` and `engine/public/sarah/` synced from public/sarah/ source
- **Today**: Dead `airport`, `attractionPrices`, `dayTrips` removed from `app.js` cityDatabase (lines 106-108)

### Remaining (nice-to-have / deferred)
- ~80 hotels have best-guess slugs (unverified) — wrong slugs show Booking.com page, functional
- Make Sarah aware of journey context (deferred)
- Update `roamin10.com` landing page from Spain-only to generic (separate project at `C:\Users\user\Documents\Projects\roamin10`)
- `cinque-terre` slug mismatch in generate-italy-data.js SLUG_MAP (pre-existing, band-aid)
- Port template to Portugal / France / Greece / Spanish Islands

## Booking.com Slug Pattern
- Slugs are unpredictable: some hyphenated (`generator-rome`), some concatenated (`grandhoteltremezzopalace`)
- No reliable way to guess — each must be verified individually
- Format: `https://www.booking.com/hotel/it/{slug}.en-gb.html?aid=304433`

## Critical Context
- Server runs on `http://localhost:3000`, city pages at `?city=florence` etc.
- `public/sarah/` is the CANONICAL source for core.js, ui.css, fab.css, data/ files
- `dist/italy/sarah/` and `engine/public/sarah/` are build copies — keep synced
- `generate-italy-data.js` `buildQuizCity()` passes `premium: { airport, attractionPrices, dayTrips, secretSpots, budget, rainyPlan }`
- `FORK_CITY` map at line 12 maps slug → Italian city name for Google Maps URLs
- Restaurant booking links: `https://www.google.com/maps/search/?api=1&query={name}+{FORK_CITY}+Italy`
- Sarah's `systemPrompt` injects budget, secretSpots, rainyPlan, restaurant links inline
- `_buildStopEl()` renders `.sarah-stop-book` anchor when `stop.bookLink` is present
