# RK Fitness Center-Gym — website

Website proposal for **RK Fitness Center-Gym**, a gym in HSR Layout, Bengaluru, by **Infinity Web & Apps**.

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide icons. Enquiries are stored in **Supabase**,
and staff are notified by email through a Supabase Edge Function.

This folder is a self-contained project. It does not share code or a database with the Lead Finder app at the repository root.

---

## Quick start

```bash
cd sites/outfitx-hsr
cp .env.example .env      # leave Supabase empty for now if you only want to look at the site
npm install
npm run dev               # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Typecheck and build to `dist/` (also writes `robots.txt`, and `sitemap.xml` once `VITE_SITE_URL` is set) |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests: form validation, phone normalisation, contact links, enquiry submission |
| `npm run test:e2e` | Browser checks against the built site (see [Testing](#testing)) |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_SITE_URL` | At launch | Final domain, with no trailing slash. Enables the canonical tag, `og:url`, absolute `og:image` and `sitemap.xml`. Leave it empty until the domain is confirmed. |
| `VITE_PROPOSAL_MODE` | No | `true` shows content still awaiting owner confirmation, each item clearly labelled. Use it for the owner demo. **Set it to `false` for the public launch.** |
| `VITE_SUPABASE_URL` | For enquiries | Supabase → Project Settings → API → Project URL. |
| `VITE_SUPABASE_ANON_KEY` | For enquiries | Supabase → Project Settings → API → `anon` `public` key. |

Only the **anon** key ever goes in the browser. It is safe there because Row Level Security lets it *insert* an enquiry
and nothing else. **Never put the `service_role` key in a `VITE_` variable.**

---

## Editing content (owner changes)

All business content lives in **`src/config/site.ts`**:

- **Business details:** phone, WhatsApp number and message, address, map destination and existing website.
- **Reviews:** `rating`, `count`, `googleReviewsUrl`, the review themes, and `excerpts`. Excerpts must be verbatim
  review text with the reviewer's name as shown on Google.
- **Hours:** set `confirmed: true` and fill in `weekly` once the owner confirms the full schedule.
- **Training options:** title, summary, detail text, image and enquiry goal for each option. Set `confirmed: true` to publish one.
- **Coaches:** add a profile only with owner-verified details (see below).
- **Images:** see [Replacing images](#replacing-images).

### What `confirmed` means

Every item marked `confirmed: false` is **hidden on the public site** (`VITE_PROPOSAL_MODE=false`). In proposal mode
it is shown with an *"Awaiting owner confirmation"* badge, so the owner can review it.

### Waiting on the owner

| Item | Where | Status |
|---|---|---|
| Training categories (Strength Training, Personalised Coaching, Mobility & Movement, General Fitness) | `trainingOptions` | Unconfirmed, hidden at launch |
| Full weekly opening hours (the listing only shows "closes 8:45 PM") | `hours` | Unconfirmed, so the site says "please call to confirm" |
| Coach profile for **Rohith**, mentioned in a review: role, bio, qualifications, photo | `coaches` | Not added |
| Coaching process steps (proposed messaging) | `coachingSteps` | Labelled in proposal mode |
| Verified Google Business Profile / reviews URL | `reviews.googleReviewsUrl` | Until it is set, the CTA opens a Google Maps search for the exact business listing |
| Verbatim review excerpts | `reviews.excerpts` | None yet; the site shows summarised themes, labelled "not direct quotes" |
| Real photographs of the gym | `images` | Demonstration images in use |
| Privacy policy wording | `src/pages/Privacy.tsx` | Draft; owner to review |
| Final domain | `VITE_SITE_URL` | Not set |

Membership prices, class schedules, equipment lists and certifications are **not** on the site, by design. Add them
only once the owner supplies them.

### Replacing images

The current images are **AI-generated demonstration images**, made in the Floot project "OUTFIT X HSR Images". They
are **not** photographs of the RK Fitness facility, and each one carries a visible *Demonstration image* label.

To use the owner's photos:

1. Put the files in `public/images/`. WebP or JPEG at roughly 1600px on the long edge is plenty.
2. In `src/config/site.ts`, point the matching entry in `images` at the new file, update `width`, `height` and `alt`,
   and set `isRealFacility: true`. The label then disappears automatically.
3. Change which images appear in the gallery, and in what order, through the `gallery` array.

---

## Enquiry backend (Supabase)

### 1. Create the table and security rules

Create a Supabase project, then run `supabase/migrations/20261015000000_enquiries.sql`, either in the SQL editor or with
`supabase db push`. It creates:

- `public.enquiries`, with database-level validation (required fields, Indian mobile format, allowed option values,
  length limits, and consent must be true).
- Row Level Security:
  - The **anon** role can only `INSERT`, and only the visitor-supplied columns.
  - **Signed-in staff** listed in `public.enquiry_staff` can read enquiries and update their `status`.
  - Nobody else can read anything.
- A rate limit of 3 enquiries per phone number per hour.

### 2. Give staff access

Invite staff under **Authentication → Users**, then add each one:

```sql
insert into public.enquiry_staff (user_id) values ('<auth user id>');
```

The owner can also view enquiries in the Supabase **Table Editor**. The dashboard is only reachable by project members.

### 3. Connect the website

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild.

The form shows **"Enquiry received"** only after Supabase confirms the insert (HTTP 201). On any failure, including
missing configuration, a network error or a rejected row, the visitor sees an honest error with WhatsApp and call
fallbacks, and what they typed is kept.

### 4. Staff email notifications (optional, recommended)

`supabase/functions/notify-enquiry` emails staff about each new enquiry through [Resend](https://resend.com).

```bash
supabase functions deploy notify-enquiry --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx \
  NOTIFY_TO=owner@example.com,coach@example.com \
  NOTIFY_FROM="RK Fitness Website <enquiries@your-verified-domain.com>" \
  WEBHOOK_SECRET=$(openssl rand -hex 24)
```

Then go to **Database → Webhooks → Create** and configure:

- **Table:** `enquiries`, event **Insert**
- **Type:** Supabase Edge Function → `notify-enquiry`, method POST
- **HTTP header:** `x-webhook-secret: <the WEBHOOK_SECRET value>`

Enquiries are saved even if email delivery fails. Failed deliveries show in the webhook logs.

---

## Deployment

The site is static and builds to `dist/`.

**Vercel:** import the repo and set **Root Directory** to `sites/outfitx-hsr`. The framework is detected as Vite.
Add the environment variables. `vercel.json` already provides the SPA rewrites (so `/training/...` and `/privacy` work
on reload), security headers and caching.

**Netlify:** set the base directory to `sites/outfitx-hsr`, the build command to `npm run build` and the publish
directory to `dist`. `public/_redirects` handles SPA routing.

Launch checklist:

- [ ] `VITE_PROPOSAL_MODE=false`
- [ ] `VITE_SITE_URL` set to the final domain (enables canonical tag and sitemap)
- [ ] Supabase variables set, and a test enquiry received end-to-end
- [ ] Owner-confirmed items switched to `confirmed: true`
- [ ] Real photos in place, or the owner has accepted the demonstration images
- [ ] Privacy policy reviewed by the owner
- [ ] Submit `sitemap.xml` in Google Search Console

## SEO

- Title and meta description as specified, with Open Graph and Twitter tags, plus `og-image.jpg` (1200×630).
- `ExerciseGym` structured data in `index.html` holds **only** supplied facts: name, phone, address and website.
  It deliberately leaves out ratings, hours and services. Add `openingHoursSpecification` only after the hours are
  confirmed.
- `robots.txt` is always generated. `sitemap.xml` and the canonical tag are generated only when `VITE_SITE_URL` is set.
- One `h1` per page, descriptive `alt` text on every image, and clean URLs (`/training/strength-training`, `/privacy`).

## Accessibility and motion

- Skip link, semantic landmarks, visible focus styles, and a keyboard-operable menu and lightbox with focus trap and Escape.
- Form errors are inline, linked with `aria-describedby`, and focus moves to the first invalid field.
- Framer Motion runs with `reducedMotion="user"`, and smooth scrolling and parallax are disabled for visitors who prefer reduced motion.
- Animations never block interaction. The hero intro finishes in about 1.5 seconds.

## Testing

```bash
VITE_PROPOSAL_MODE=true VITE_SUPABASE_URL=https://test-project.supabase.co VITE_SUPABASE_ANON_KEY=test npx vite build
npm run test:e2e
```

The end-to-end script launches the preinstalled Chromium (override it with `CHROMIUM_PATH`) and intercepts every
Supabase and Google Maps request, so nothing real is sent. It checks:

- no horizontal overflow and no console errors at five viewports (375, 412, 768, 1366 and 1920 px)
- that nav links reach their sections, and the header switches from transparent to solid
- the mobile menu: open, focus trap, Escape and navigation
- the skip link
- that every contact link points at the correct destination
- the form: inline errors, success only on HTTP 201, a single request on double-click, and no success shown on failure
- that the training-page CTA pre-selects the goal
- the lightbox keyboard controls, the privacy and 404 pages, and reduced motion
- the SEO metadata

Screenshots are saved to `tests/e2e/screenshots/`, which is gitignored.
