# Formative

Responsive Next.js learning app for the “Think in Outcomes” pilot unit. The code supports the expanded curriculum; Product Vision remains usable against the original database schema while the new migrations are pending.

## Curriculum schema rollout

The expanded curriculum requires the migrations after `202610080001_initial.sql` in filename order. Until they are applied, the app detects the missing `curriculum_nodes` table and serves the existing Product Vision path, lesson, review, progress, and curator editor. Checkpoint and artifacts open after the expanded schema is installed. Other database errors still surface normally.

The local Supabase project has not been migrated to the expanded schema. Live learner and Admin tests remain pending as requested; local typecheck, lint, tests, and build verify the compatibility code only. In the original schema, Product Vision is the single published, completable lesson; the other five path labels are previews and do not enter the progress denominator.

## Implemented

- Supabase email/password sign-in, onboarding, learner and Admin/Curator roles.
- Published path, lesson reading, optional external resources, server-graded checks with retries, reflection, atomic completion receipt, local-day progress/streak, and scheduled review.
- Admin editor for Product Vision content blocks, external resources, checks, explanations, and review variants. Save draft, preview, publish immutable revision.
- RLS, narrow grants, private answer-key schema, owner-checked RPCs, audit records, and separate Storage buckets.
- Mobile and desktop layouts. UI states for loading, empty content, errors, unavailable lessons, offline lesson work, and save failures.

## Local setup

1. Use Node.js 20.9 or newer. Run `npm ci`.
2. Create a Supabase project. In its SQL Editor, run [`supabase/migrations/202610080001_initial.sql`](supabase/migrations/202610080001_initial.sql) and then [`supabase/seed.sql`](supabase/seed.sql). Apply in this order. The seed is repeatable.
3. Copy `.env.example` to `.env.local` and set the project URL, publishable key, and `NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000`. The publishable key is designed for browser use. Keep database passwords and service credentials out of `NEXT_PUBLIC_*` variables and source control.
4. In Supabase Auth, configure the site URL as `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL. Enable email/password authentication and configure email delivery for confirmations.
5. Run `npm run dev` (`npm.cmd run dev` in PowerShell with script execution disabled), open `http://localhost:3000`, create an account, confirm the email if required, and choose a learning timezone in onboarding.

The current workspace has a local `.env.local` with a publishable key. It is gitignored. A database password is still needed to apply migrations; the app will not complete the learner flow until the schema and seed are installed.

## Grant Andre Admin access

After Andre signs up, use the trusted Supabase SQL Editor to provision the role. Replace the email:

```sql
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where email = 'andre@example.com'
on conflict do nothing;
```

The app provides no self-promotion or general role-management UI. The same account can then use `/admin` and `/learn`.

## Vercel deployment

1. Import this repository as a Next.js project in Vercel; use the default build command `npm run build`.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_ORIGIN=https://YOUR_DOMAIN` to the Vercel environment.
3. Add the deployed origin as Supabase Auth site URL and `https://YOUR_DOMAIN/auth/callback` as a redirect URL.
4. Apply migrations and seed to the target Supabase project before opening enrollment. Provision the Admin role using the trusted SQL above.
5. Verify sign-in, draft isolation, a complete lesson, review scheduling, and mobile layout on the deployed origin before sharing it with learners.

No deployment is performed by this repository setup. Keep development and production Supabase projects separate.

## Verification

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`tests/access.integration.test.ts` runs only when two test learner accounts are supplied via `TEST_LEARNER_A_EMAIL`, `TEST_LEARNER_A_PASSWORD`, `TEST_LEARNER_B_EMAIL`, and `TEST_LEARNER_B_PASSWORD`, along with the public Supabase variables. It verifies owner isolation, direct-write denial, draft/key secrecy, and Admin denial. The browser journey also needs `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD`; it writes completion to the learner test account, so use disposable test accounts. Browser screenshots are written to `artifacts/screenshots/` when that test runs. Recreate or reset those accounts before repeating the first-completion journey.

Without live test accounts, the access and browser suites are skipped. The local domain suite covers Makassar midnight, calendar-day streaks, leap day, a missed day, and the pinned progress denominator. SQL was parsed syntactically, but transaction, RLS, and migration execution require a real Supabase database.

For visual layout checks without a database, run `npm run dev`, then `node scripts/capture-preview.mjs`. This creates **sample-data preview screenshots** for path, lesson, completion, progress, and Admin at desktop and mobile widths. `/dev-preview/*` returns 404 in production; these images do not prove backend behavior.

## Known limits

- Only Product Vision is a complete lesson. The other path items are preview labels without lessons or rewards.
- Email reset UI, file upload UI, bookmarks, notes, reports, content version migration, automated export/deletion, and checkpoint submission are beyond this first slice.
- The current Admin editor edits and republishes the pilot lesson; adding new lesson identities and changing curriculum manifests needs a later authoring workflow.
- External article availability and editorial suitability still need curator review. Opening an external resource never grants completion.
- Live Supabase migration, access tests, and authenticated end-to-end tests remain pending until database access and disposable test accounts are available.
- `npm audit --omit=dev` reports no production dependency advisories. The full audit reports five high-severity advisories in the development-only Next ESLint dependency chain; no patched `braces` release was available when this lockfile was created.
