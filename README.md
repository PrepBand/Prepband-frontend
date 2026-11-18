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
```

Requires a `.env` — copy `.env.example` and fill in the real Supabase
project URL/anon key (not committed; gitignored). Vite only reads `.env` at
server startup, not via HMR, so restart `npm run dev` after editing it.

## Deployment

Deployed on Netlify: **https://prepband.netlify.app**. Continuous
deployment is connected to this repo's `main` branch (`PrepBand/Prepband-frontend`
on GitHub) — a push to `main` triggers a build and redeploy automatically.
`netlify.toml` configures the build command, SPA fallback redirect, and
baseline security headers.

## Status

Auth (signup/login/email-OTP verification/password reset), onboarding, the
landing page, dashboard, and profile (with Cloudflare R2 avatar upload via
a Supabase Edge Function) call real, live services. The five `/app/*`
practice/mock/history/progress/certificates pages are an interactive
front-end design pass only — there's no test engine or backend wired up to
them yet (see `../CLAUDE.md`'s "Not started yet" section for the full
remaining list).

## Before touching any external service

The user works on other, unrelated projects through the same connected
MCP/plugin accounts (GitHub, Render, Cloudflare, Supabase, Resend, Netlify,
etc.). **Before any write/mutating call through one of those services:
confirm the resource is actually named for Prepband, then get the user's
explicit approval for that specific action** — there are no standing
exceptions for any of these services. See `../CLAUDE.md`'s "Cross-project
safety rule" and `../rules.md` for the full rule. If you can't confirm the
resource is Prepband's own, make no change and ask instead of guessing.
