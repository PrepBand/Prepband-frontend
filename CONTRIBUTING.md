# Contributing to Prepband

Prepband is two repositories that deploy separately:
`PrepBand/Prepband-frontend` (React, Netlify) and `PrepBand/Prepband-backend`
(FastAPI, Render). The database is Supabase.

## Workflow

1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Open a pull request into `main` (or `development` for batched work).
   `main` is always deployable.
3. CI must pass: lint, typecheck/tests, dependency audit, secret scan.
4. One approving review before merge. A database migration needs its own
   explicit approval (see below).
5. After merge, follow the backend repo's `docs/RUNBOOK.md` "Release" (the backend deploy is
   triggered by hand).

Commit messages: imperative mood, one line under ~72 characters, details in
the body ("Add CSV import for questions", not "added csv").

## Local checks

```bash
# backend
python -m ruff check .
python -m pytest

# frontend
npm run lint
npm run build
npm test
```

## Database migrations

- New file in `database/migrations/` with the next number. Never edit an
  applied migration; write a new one.
- Additive where possible, so the running app keeps working before its new
  code deploys.
- Every new table: RLS on, policies written, indexes on foreign keys.
- Every `SECURITY DEFINER` trigger function: revoke `EXECUTE` from `public`,
  `anon`, `authenticated`, then run the Supabase security advisor.
- Applying a migration to the live project needs the owner's approval each
  time (`Docs/rules.md`).

## Rules that keep Prepband honest

- Never show a band score for Writing or Speaking.
- Never imply Prepband is IELTS or official.
- Only original or properly licensed content, with source and licence recorded.
- No secrets in code, logs, URLs or the frontend bundle.
- Student recordings never leave the browser.

## Definition of done (per change)

- [ ] Tests cover the new behaviour, including the failure path.
- [ ] Lint, typecheck and tests pass locally and in CI.
- [ ] Every screen handles loading, empty, error and permission-denied states.
- [ ] Keyboard-usable, labelled, works at 320 px.
- [ ] Admin writes are covered by the audit log (automatic for `/admin` routes).
- [ ] Docs updated: README, runbook or admin guide if behaviour changed.
- [ ] Migrations reviewed and approved before they go live.
