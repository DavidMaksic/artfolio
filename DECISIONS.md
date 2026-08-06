# Documented Sprints

Agile methodology is utilized in building the Artfolio app.
Purpose of this file is to track progress and decisions of each sprint.

---

## Sprint 0 — Project Foundation

**Goal:** Scaffold the project and ensure all essential tools are wired up and communicating correctly. Zero features, just infrastructure.

**Completed:**

- Monorepo set up via npm workspaces (`/client`, `/server`, `/shared`)
- Docker Compose runs Postgres 16 and Redis 7 locally
- Node.js + Express server with a `/health` route returning `{ status: "ok" }`
- Cloudinary upload/delete and Resend email utility functions set up
- Vue 3 TypeScript client scaffolded, and Pinia auth store initialized
- Tailwind v4, TanStack Query, Vue Router, Drizzle ORM, tRPC proxy, Redis, and BetterAuth configured
- Vitest unit test confirms the `/health` route works
- Playwright e2e test confirms the client works
- Set up the CI pipeline via GutHub Actions

**Decisions:**

- Used `tsx watch` instead of `ts-node-dev` as it is actively maintained and has no deprecated dependencies
- Used `npm create vue@latest` over `npm create vite@latest` as it scaffolds Vue Router, Pinia, Vitest, and Playwright automatically with correct project reference tsconfig setup
- Chose Docker for Postgres instead of installing it locally, in order to use this chance to familiarize myself with containerization
- Chose Drizzle over Prisma to avoid too much abstraction
- Used `@artfolio/shared` workspace package for Zod schemas and TypeScript types shared between client and server, avoiding duplication and keeping validation in sync across the stack
- Adopted `.test.ts` convention for Vitest files and `.spec.ts` convention for Playwright files to avoid test runner confusion
- Currently disabled e2e testing on CI pipeline, to reduce time needed to commit changes

**Issues resolved:**

- `Cannot find name 'process'` — fixed by adding `"types": ["node"]` to `tsconfig.json`

**Known issues carried forward:**

- `esbuild` vulnerability inside `drizzle-kit` — moderate severity, dev dependency only, not a production risk; awaiting fix from the Drizzle team

---

## Sprint 1 — Authentication

**Goal:** Users can sign in through OAuth or email (via magic link or OTP), receive a welcome email, with sessions persisted in Redis.

**Completed:**

- Google and Discord OAuth wired and working
- Email OTP provides both magic link for automatic, and code for manual verification
- Implemented Playwright e2e tests for authentication: magic link flow, manual OTP entry, session persistence, sign out
- E2E test infrastructure set up with Playwright fixtures, global-setup, and direct Redis OTP reading

**Decisions:**

- Installed shadcn/ui to enable faster and easier component scaffolding
- `emailOTP` plugin only (no separate `magicLink` plugin) — magic link is a manually constructed URL embedded in the same email as the OTP code, Notion-style
- BetterAuth with HTTP-only cookies over JWT — no token management in client code
- Phosphor Icons (ph:) via @iconify/vue for UI icons
- TanStack Query caches sessions with `authClient.getSession()`
- Removed e2e helpers: now they live in `fixtures.ts` (page-dependent) and `global-setup.ts` (DB cleanup, Node-only)

**Issues resolved:**

- shadcn-vue init failing due to missing `paths` + `baseUrl` in client `tsconfig.json` — fixed by adding `ignoreDeprecations: "6.0"`
- `authClient.useSession()` returned a `Ref` in Vue, not a plain object — destructuring failed; must be accessed via `.value`
- `@artfolio/shared` not symlinked in `client/node_modules` — fixed by adding `"@artfolio/shared": "*"` to client/package.json and running `npm install`
- Fixed betterAuth middleware handling by replacing `.use` with `.all` in the app configuration
- Project references wired up (server as composite project, referenced from client) which fixes `typecheck` bugs
- `vue-tsc --build` crawling server source via direct `../../../server/src/router` import — fixed with project references
- `npm run build --workspaces` failing on shared — fixed with `--if-present`

**Known issues carried forward:**

- None

---

## Sprint 2 — Profile

**Goal:** Users can set up and edit their profile. Any visitor can view an artist's public profile page. Commission availability is toggleable.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 3 — Color Theming + Posts (Part 1)

**Goal:** Profile background derives accent colors from the user's avatar. Users can create posts with multiple images, categories, and tags.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 4 — Posts (Part 2) + Post Detail View

**Goal:** Users can edit and delete their posts. Any visitor can view a full post detail page.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 5 — Feed

**Goal:** Logged-in users see a chronological feed. New users see discovery posts. Feed paginates to a limit with a well-being reminder.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 6 — Engagement

**Goal:** Users can like posts, bookmark them to a private collection, and comment on posts.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 7 — Following + Discovery & Search

**Goal:** Users can follow and unfollow artists. Discovery Explore page and search are functional.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 8 — Notifications

**Goal:** Users receive real-time notifications for follows, likes, and comments. Unread badge is visible. Notifications can be marked as read.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**

---

## Sprint 9 — Polish, Testing & Launch Prep

**Goal:** The app is stable, performant, accessible, and ready for production launch.

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**
