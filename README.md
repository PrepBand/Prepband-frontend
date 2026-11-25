# prepband-frontend

The frontend for **Prepband** — a free-tier, fully-hosted, open-source
IELTS-style practice platform (Listening, Reading, Writing, Speaking, full
mock exams, honest scoring, unofficial completion certificates). **Not
affiliated with IELTS** — practice scores are never presented as official
results.

See `../CLAUDE.md` (source of truth for what's actually built and why) and
`../IELTS_Preparation_Platform_Full_Project_Scope.md` (the full product
spec) in the parent `PrepBand/` directory before making changes here.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 + a hand-written global stylesheet (CSS custom properties for theming) |
| Routing | React Router |
| Forms | React Hook Form + Zod |
| Auth / DB client | `@supabase/supabase-js` (typed via a generated `database.types.ts`) |
| Fonts | Self-hosted (`Caveat`, `Source Serif 4`, `Courier Prime`) — no Google Fonts `<link>` |
| Hosting | Netlify (static SPA, build via `npm ci && npm run build`, publish `dist`) |

## Architecture

This repo is one of two independently deployed apps that make up Prepband
(the other is [`prepband-backend`](../prepband-backend), a separate git
repo under the same local `PrepBand/` folder — not a monorepo, by design).

```text
Browser
  │
  ├──> Netlify (this app, static SPA)
  │       │
  │       ├──> Supabase Auth — signup/login/OTP verification/password reset,
  │       │    session management (handled entirely client-side via the SDK)
  │       │
  │       ├──> Supabase Postgres (via supabase-js + RLS) — profile reads/writes,
  │       │    onboarding data
  │       │
  │       └──> Supabase Edge Function `upload-avatar` — proxies profile-photo
  │            uploads to Cloudflare R2 (this app never talks to R2 directly;
  │            no storage credentials ever reach the browser bundle)
  │
  └──> prepband-backend (Render) — not yet called by any frontend code.
       VITE_API_BASE_URL is set but unused; wiring this up is a deliberate
       future step once there's a real feature (e.g. the test engine) that
       needs the backend instead of talking to Supabase directly.
```

Auth and basic profile data go straight from the browser to Supabase using
its JS SDK and Row Level Security — there is no backend in that path today.
The FastAPI backend exists for work that genuinely can't happen client-side
(e.g. server-authoritative test attempts, grading, PDF certificates in
later phases) and currently only exposes `/health`, `/me`, and a
role-gated `/admin/ping` proof-of-concept.

## Project structure

```text
src/
  app/               # (not yet split out — routing lives in App.tsx)
  components/
    auth/            # shared auth-page building blocks (fields, layout, guards)
    layout/          # Header, Footer, Logo
  data/              # static content (landing copy, practice-set metadata)
  hooks/
  lib/               # supabaseClient, generated database.types.ts, AuthProvider, zod schemas
  pages/
    auth/            # login/signup/OTP-verify/forgot-reset pages
    (app pages)      # Dashboard, Profile, Practice, Mock Tests, etc.
  sections/          # landing-page sections only
  styles.css         # the one global stylesheet
```

## Local dev

```bash
npm install
npm run dev       # Vite dev server, pinned to http://localhost:5180
npm run build     # tsc -b && vite build
npm run preview   # preview the production build
npm run lint      # oxlint (correctness, React hooks, jsx-a11y)
npm test          # Vitest: unit, component and axe accessibility tests
```

Requires a `.env` — copy `.env.example` and fill in the real Supabase
project URL/anon key (not committed; gitignored). Vite only reads `.env` at
server startup, not via HMR, so restart `npm run dev` after editing it.

## Reliability and security notes

- **Cold starts:** the free Render API sleeps when idle. `src/lib/apiClient.ts`
  shows a "Waking up the server" banner after 4 s and retries GET/PUT (never
  POST/PATCH/DELETE) on network errors and 502/503/504 for up to 90 s.
- **Error pages:** `/403`, `/500`, `/503`, plus an error boundary that shows the
  500 page if a screen crashes.
- **Policies:** `/about`, `/privacy`, `/terms`, `/cookies` (drafts for legal review).
- **Headers:** `netlify.toml` sets HSTS, frame/sniff/referrer protections and a
  **report-only** CSP. Switch it to enforcing after a clean live check
  (backend repo `docs/RUNBOOK.md` section 3).
- **Admin:** `/admin` also has Analytics, Certificates (revocation) and the
  Audit log; Tests supports bulk actions; sections support CSV import/export.

## License

MIT. See [`LICENSE`](LICENSE). Contributions: [`CONTRIBUTING.md`](CONTRIBUTING.md).
