# Session Context: Italy in 10

## Goal
Build Italy in 10 as a clean, extensible template app that can be copied for Portugal, France, Greece, Spanish Islands.

## Architecture
- Single `app.js` reads `italy.json` dynamically → generates all HTML (zero static HTML files)
- 10 cities, 5 journeys, gradient city cards, Italian flag colors
- PWA, Sarah overlay, FAB, back-to-journey navigation, testimonials, footer
- Sarah core files (`sarah-core.js`, CSS, FAB, avatar) are country-agnostic — copy unchanged

## Key Files
- `app.js` — Express server, free city page rendering
- `data/italy.json` — Raw Italy data (90 hotels, all city info)
- `data/add-booking-links.js` — Script adding `bookingLink` to all hotels
- `generate-italy-data.js` — Builds `public/sarah/data/italy.js` and `database.js` with premium fields
- `public/sarah/sarah-core.js` — CANONICAL source (brain of Sarah Advisor)
- `public/sarah/sarah-ui.css` — CANONICAL source (styling)
- `public/sw.js` — Service worker for PWA install prompt
- `public/.well-known/assetlinks.json` — Android Digital Asset Links
- `dist/italy/sarah/` — Build copy (must mirror public/sarah/)
- `engine/public/sarah/` — Engine copy (must mirror public/sarah/)

## Progress

### Done
- Italy app fully built: 10 cities, 5 journeys, gradient cards, Italian colours, PWA, Sarah overlay, FAB, testimonials, footer
- All 90 hotels enriched with vibe, area, proximity, realistic price ranges; Booking.com slugs verified/corrected via `add-booking-links.js`
- All 9 remaining cities researched → `/research/*.md`; expanded data (airport, attractionPrices, dayTrips) imported into `italy.json`
- Premium content moved from free page to Sarah: secretSpots, budget estimates, rainyPlan, restaurant links via Google Maps
- `generate-italy-data.js` generates `italy.js` + `database.js` with premium fields + Google Maps bookLinks using `FORK_CITY` map
- Free page shows: basic transport, hotel cards (affiliate), 3 restaurants (teaser), old day_trips, must-see, fiestas, phrases, Sarah CTA
- CTA: "Airport transfers, entry prices, day trips, hidden gems — skip 20 hours of Googling. Sarah knows this city inside out."
- Sarah's system prompt injects budget, secretSpots, rainyPlan, restaurant links inline
- `<strong>Next</strong>` on all 4 quiz buttons + all instruction paragraphs; Next button styled Italian green `#009246` + red underline `#ce2b37`
- `.sarah-stop-book` (Find on Maps button) + `.sarah-stop-price` rendered on itinerary stops when `bookLink` present
- All Spanish references purged across codebase: sarah-core.js defaults/flag, city vibes/sensory pics (Spanish→Italian), "Tapas"→"Osterias", "TheFork"→"Google Maps" in system prompt
- `package.json` renamed from `alicante-a-fondo` to `italy-in-10`; `public/manifest.json` Spain→Italy; `assetlinks.json` package `com.spainten`→`com.italy10`
- `engine/server.js` fixed: wrong email, es-ES fallback, Spanish embassy contacts (Madrid→Rome)
- Cache-busters bumped (core.js v5, ui.css v4, fab.css v1)
- Dead `airport`/`attractionPrices`/`dayTrips` removed from `app.js` cityDatabase (lines 106-108)
- `dist/italy/sarah/` and `engine/public/sarah/` synced from public/sarah/ source (11 June)
- Italy deployed to Vercel at `italy.roamin10.com` (git init, GitHub push, Vercel project created)
- Android project copied from Spain, fully Italy-ified: package `com.italy10.city.twa`, app name "Italy in 10 Minutes", theme colour `#1a7a3a`, points at `italy.roamin10.com`
- AAB built and uploaded to Play Console (pending store listing completion)
- PWA icons added (`icon-512.png`, `icon-192.png` from Spain as placeholders); service worker created (`sw.js`) and registered
- France in 10 skeleton created (`C:\Users\user\Documents\Projects\France in 10\`) with folder structure, `package.json`, `vercel.json`, `.gitignore`
- France hotels researched in 4 cities: Paris, Nice, Lyon, Bordeaux (9 hotels each, 3 tiers) → `research/*.md`
- **This session (14 Jun)**: `.gitignore` updated — 1008 build artifact files removed from git tracking, commit amended and pushed
- **This session**: `assetlinks.json` SHA256 updated to match Italy keystore (`7D:47:2C:...`, owner `CN=Neil`)
- **This session**: PWA manifest reconciled — `short_name: "Italy10"`, both 192+512 icons, `display_override: ["fullscreen", "standalone"]`
- **This session**: Service worker improved to precache manifest + icons + core CSS/JS
- **This session**: All PWA + Android icons replaced — new Italian design (dark red bg, Italy map, 10)
- **This session**: Fixed blank mobile screen — removed `jimp` from runtime deps, added `defer` to render-blocking scripts (italy.js 174KB + database.js 122KB were blocking paint)

### Blocked
- Play Store listing for Italy needs: description, 2-3 screenshots, content questionnaire, target countries, submit for review
- `roamin10.com` landing page still Spain-only — needs generic makeover
- `cinque_terre` / `cinque-terre` slug mismatch pre-existing, band-aid fix needed
- ~80 hotels have best-guess slugs (unverified, but functional)
- France app has no `app.js`, no data files, no Sarah setup yet

## Key Decisions
- Premium data constants live in `generate-italy-data.js` (not `italy.json`)
- Google Maps search links replace TheFork for restaurant booking — works globally with Italian city names
- Per-country email addresses (italy10minutes, spainin10support)
- Separate Vercel projects per country rather than one unified app
- `roamin10.com` as mothership landing page with country cards
- France will use same template as Italy when populated
- Android build artifacts excluded via `.gitignore` — only source files tracked
- `jimp` is a build-time tool only (NOT in runtime deps) — use `npm run icons` to regenerate

## Next Steps
1. Submit Play Store listing (description, screenshots, content questionnaire, select countries)
2. Test PWA install prompt on phone at `italy.roamin10.com`
3. Test Android app via installed AAB (verify full-screen TWA with new icons)
4. Delete old `10MinuteITALY` folder (Spain backup)
5. Populate France: `france.json`, `generate-france-data.js`, copy Sarah core files

## Critical Context
- Server runs on `http://localhost:3000`, city pages at `?city=florence` etc.
- `public/sarah/` is CANONICAL source for core.js, ui.css, fab.css, data/ files
- `dist/italy/sarah/` and `engine/public/sarah/` must mirror public/sarah/
- `generate-italy-data.js` has `FORK_CITY` map (slug → Italian city name), `PREMIUM_SECRET_SPOTS`, `PREMIUM_BUDGET`, `PREMIUM_RAINY_PLAN` constant objects
- Restaurant booking links: `https://www.google.com/maps/search/?api=1&query={name}+{FORK_CITY}+Italy`
- Sarah's `systemPrompt` injects budget, secretSpots, rainyPlan, restaurant links inline
- `_buildStopEl()` renders `.sarah-stop-book` (Find on Maps) + `.sarah-stop-price` when present
- Android package: `com.italy10.city.twa`, points at `italy.roamin10.com`
- `assetlinks.json` currently has Spain's SHA256 fingerprint — may need update if Sarah used a new keystore
- PWA needs service worker (`sw.js`) and icons (`icon-512.png`, `icon-192.png`) for install prompt
- France research: Paris, Nice, Lyon, Bordeaux done (9 hotels each, 3 tiers); 6 more cities needed for 10 total

## Live URLs
- **Vercel (auto)**: `italy-in-10.vercel.app`
- **Vercel (custom)**: `italy.roamin10.com`
- **GitHub**: `https://github.com/spainin10support-hash/italy-in-10.git`

## Git Hygiene
- `.gitignore` excludes: `node_modules/`, `.env`, `local.properties`, `*.keystore`, `*.jks`, `.DS_Store`, `Thumbs.db`, `app/build/`, `app/release/`, `.gradle/`, `build/`, `.idea/`
- Only source files committed — no build artifacts
