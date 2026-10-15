# Infinity Lead Finder

Lead-generation web app for **Infinity Web & Apps**. It finds **real, operating local businesses that have no
listed website but do have a public phone number**, and saves them to a CRM you can work through.

The workflow: choose location → choose niche → enter lead target → find real businesses → keep the ones without listed
websites → require phone numbers → save to CRM → export → contact.

- Data comes only from legitimate provider APIs: **Google Places API (New)**, **Geoapify Places** and **OpenStreetMap
  (Overpass)**. The app contains no demo data and never scrapes Google Maps.
- Searches can be any size. A job splits the city into a grid of areas, pages through every provider that is configured,
  skips duplicates, and runs until one of these happens: the target is reached, nothing is left to search, or a
  provider's quota runs out. It reports which one happened.
- Website status is based on evidence. A business only counts as "No Website Listed" when the provider's website field is
  empty, or holds nothing but a social-media profile. A site that fails to load is marked *Website Unreachable*, never
  *No Website*.
- Every number is normalised to E.164 format (+91 by default) and the original is kept. Businesses without a phone
  number never enter the main list. Numbers are shown as the provider published them and have **not** been checked by a
  live call.

> **Also in this repo:** [`sites/outfitx-hsr/`](sites/outfitx-hsr/README.md) — a standalone client website (OUTFIT X HSR gym proposal), built and deployed separately from the Lead Finder.

---

## Quick start

```bash
cp .env.example .env            # then edit DATABASE_URL (and any API keys)
npm install
npm run db:migrate              # creates the tables
npm run dev                     # http://localhost:3000
```

Open the app, create your account, and run a search. To block anyone else from signing up afterwards, set
`ALLOW_SIGNUP=false`.

### Production

```bash
npm run build
npm run db:migrate
npm start                       # web app
npm run worker                  # optional: keeps searches running with no browser tab open
```

## Configuration (what you need to supply)

| Variable | Required | What it is / where to get it |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL 14+ connection string. **Supabase on Vercel:** click **Connect** → **Transaction pooler** (port 6543); the session pooler allows only ~15 clients in total, which serverless instances exhaust quickly. On an always-on server, the session pooler or a direct connection also works. Any other Postgres host works as well. |
| `OSM_ENABLED` | No (default `true`) | OpenStreetMap through Overpass. Free, no key. Phone coverage for Indian businesses is **patchy**, so expect fewer leads per search than with Google. |
| `OSM_CONTACT_EMAIL` | Recommended | Added to the User-Agent header, as the OSM/Nominatim usage policies ask. |
| `OVERPASS_URL`, `NOMINATIM_URL` | No | Point these at other Overpass/Nominatim instances (for example your own) for heavy use. |
| `GOOGLE_PLACES_API_KEY` | Optional | Google Cloud Console → enable **Places API (New)** → create an API key, restricted to that API. Has the best phone and website coverage. **Billed:** asking for phone and website fields uses the higher-priced Text Search tier. |
| `GEOAPIFY_API_KEY` | Optional | Sign up at https://myprojects.geoapify.com → create a project → copy the API key. The free tier is 3,000 credits a day. |
| `DB_POOL_MAX` | No | Database connections per app instance. Defaults to 1 on Vercel (serverless) and 10 elsewhere. |
| `SEARCH_GRID_SIZE` | No (default 4) | The city is split into N×N areas. Raise it for big cities or large targets. |
| `JOB_STEP_SECONDS` | No (default 20) | How many seconds of work each job step does. |

You need at least one provider. Whichever ones are configured get used, in this order: Google → Geoapify → OSM.
API keys are only read on the server. The browser only ever learns whether each provider is configured.

> **What I could not test from the build sandbox:** the sandbox has no network access to Overpass, Nominatim or Geoapify,
> and no API keys were provided. So every acceptance check ran against local mock servers that speak each provider's
> exact HTTP protocol (see *Tests*). Run one live search with your real configuration to confirm end to end.

## How a search works

1. **Plan.** The city (and the locality, if you give one) is geocoded through Geoapify, then Google, then Nominatim,
   falling back down that list if one fails. The area is split into a grid, searched centre first; the locality is
   searched before the rest of the city.
   With **Search reach** set (+10 / +25 / +50 km), the band around the city is gridded too and searched after the city, so a search keeps finding businesses once the city is used up.
2. **Fetch.** For each provider and area, the job pages through results:
   - Google: `nextPageToken`, up to 60 results per query, which is why the city is split into areas.
   - Geoapify: `offset`.
   - Overpass: one bbox query per area, with the phone filter applied on the server.

   Requests are throttled per provider and retried with exponential backoff and jitter on 429 and 5xx responses,
   honouring `Retry-After`.
3. **Evaluate.** For each business: normalise the phone (if there's no valid phone it's excluded), classify the website,
   optionally check that the site loads (this check refuses private and internal addresses), apply the Instagram filter,
   and score lead quality (0–100).
4. **Deduplicate and save.** A business counts as a duplicate if it matches an existing lead on any of:
   - provider ID (from any provider seen so far)
   - normalised phone number (enforced by a unique index)
   - normalised name, within 150 m or in the same locality

   A duplicate adds its source ID to the existing lead and fills in any empty fields; it is never inserted twice.
5. **Stop honestly.**
   - *Target reached*
   - *No more results* (with "Only X of Y found")
   - *Provider limit* (quota, rate limit or rejected key; resumable from the exact area and page where it stopped)
   - *Failed* (with the reason)

Jobs live in the database and work in time-boxed **steps** guarded by a row lock. Steps are driven either by the open
browser tab or by `npm run worker`, so searches survive refreshes and restarts and can be paused and resumed.
On serverless hosts such as Vercel, a search only advances while a tab is open. Run the worker on any always-on machine
if you want searches to keep going in the background.

### Website status values

| Status | Meaning |
|---|---|
| No Website Listed | The provider's website field is empty, or only holds a social or messaging link (Instagram, Facebook, WhatsApp…). The exact reason is stored as evidence. |
| Website Available | A URL is listed (and loaded, if you turned on the check). Free builder or directory pages (business.site, linktr.ee, Justdial…) are flagged as **weak**. |
| Website Unreachable | A URL is listed, but the reachability check failed (DNS, timeout, 5xx). |
| Website Status Unknown | No evidence either way, e.g. a CSV import without a website column. |

### Lead quality score

| Signal | Points |
|---|---|
| Phone number | +30 |
| Mobile number (reachable on WhatsApp) | +10 |
| No website | +30 (weak or unreachable website: +20) |
| Instagram | +10 |
| Address | +5 |
| Opening hours | +5 |
| Reviews | up to +10 |

High is 70 or more, Medium is 45–69.

## Features

- **Find Leads:**
  - Defaults are India / Karnataka / Bengaluru.
  - Optional locality, 18 preset niches plus a custom niche, any positive lead target.
  - Website filter: none / weak / all. Instagram filter: any / has / none. Optional minimum quality.
  - Optional check that listed websites load.
  - Live progress: found vs target, businesses checked, duplicates, exclusions, API requests, areas covered per
    provider, and an activity log. Pause, resume and cancel.
- **Stats:** total unique leads, leads with phones, leads with no website, leads with Instagram, contacted, follow-ups
  due, and leads remaining to reach active targets.
- **Leads CRM:**
  - Sortable, paginated table (up to 500 rows per page), with cards on mobile.
  - Filters: text search, niche, city, phone, website status, Instagram, lead status, follow-ups due.
  - Row actions: Call (`tel:`), WhatsApp, Instagram, Business profile, Copy phone, Details, Mark as contacted, Schedule
    follow-up, Export lead.
  - Bulk actions: export selected, copy phone numbers, set status, delete.
  - The detail drawer shows all evidence and source IDs, plus notes and the follow-up date.
- **CRM statuses:** New Lead, Ready to Contact, Contacted, Interested — Follow-up, Demo Scheduled, Proposal Sent,
  Converted, Rejected.
- **CSV:**
  - Export the filtered view, all eligible leads (phone + no website), or everything (asks you to confirm first).
  - Exports are protected against formula injection.
  - Import checks for duplicates and recognises common column names.
- **Search History:** every search with its parameters, results and stop reason. Unfinished searches can be resumed.
- **Security:**
  - bcrypt passwords; HTTP-only session cookies, with only a SHA-256 hash of the session token stored.
  - Every query is scoped to the signed-in user.
  - Input is validated with zod.
  - API keys stay on the server.

## Provider terms and limits

- **OpenStreetMap:** data © OpenStreetMap contributors, under the ODbL. Attribution is shown in the app and included in
  CSV exports. The public Overpass and Nominatim instances are for light use. The app throttles requests (Overpass ≥ 2 s
  apart, Nominatim 1 request per second), but for heavy daily use run your own instance or use a commercial one.
- **Google Places:** Google's Maps Platform terms limit how long most Places content may be cached (place IDs can be
  stored indefinitely). Check the current terms for your use case before keeping Google-sourced details long term. The
  stored `place_id` lets you refresh a record later.
- **Geoapify:** requires "Powered by Geoapify" attribution, which is shown.
- **Instagram:** no provider API exposes Instagram reliably. Links only come from OSM `contact:instagram` tags, or from a
  website field that holds an Instagram URL, so most leads will show none. The app never guesses Instagram handles.

## Tests

```bash
npm test                 # unit + integration (needs a Postgres test DB, default postgres://ilf:ilf@localhost:5432/ilf_test)
npm run build && npm run test:e2e   # full browser acceptance run (headless Chromium)
```

The integration and e2e tests replace provider HTTP endpoints with **test-only** mocks that return responses shaped
exactly like Overpass, Nominatim and Google Places. The application never ships or shows mock data. The e2e run checks
all 12 acceptance criteria against the real production build, a real database and a real browser:

- target of 100 reached
- every lead has a phone number
- no listed websites in the default results
- no duplicates on a repeated search
- pagination across areas
- leads persist across refresh and logout/login
- CSV export matches the filter
- 429s and provider failures are shown honestly
- "Only X of Y" reported
- keys never reach the browser
- no horizontal scroll at 390 px wide

## Project layout

```
src/lib/providers/   google.ts · geoapify.ts · osm.ts — one Provider interface
src/lib/pipeline.ts  phone/website/instagram/quality evaluation per business
src/lib/jobs.ts      resumable, lock-protected search job runner
src/lib/leads-store.ts  dedup + save
src/lib/website.ts   website classification + safe reachability check
src/lib/phone.ts     libphonenumber normalisation
src/app/api/…       REST endpoints (auth, searches, leads, export, import, stats)
src/app/(app)/…     Find Leads, Leads CRM, Search History pages
drizzle/             SQL migrations
scripts/worker.ts    background job worker
```
