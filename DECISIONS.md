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
- Currently disabled e2e testing on CI pipeline, to reduce time needed to commit changes

**Issues resolved:**

- `Cannot find name 'process'` — fixed by adding `"types": ["node"]` to `tsconfig.json`

**Known issues carried forward:**

- None

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
- Moved some e2e helper functions to `fixtures.ts` (page-dependent) and `global-setup.ts` (DB cleanup, Node-only)

**Issues resolved:**

- shadcn-vue init failing due to missing `paths` + `baseUrl` in client `tsconfig.json` — fixed by adding `ignoreDeprecations: "6.0"`
- `@artfolio/shared` not symlinked in `client/node_modules` — fixed by adding `"@artfolio/shared": "*"` to client/package.json and running `npm install`
- Fixed betterAuth middleware handling by replacing `.use` with `.all` in the app configuration
- Project references wired up (server as composite project, referenced from client) which fixes `typecheck` bugs
- `npm run build --workspaces` failing on shared — fixed with `--if-present`

**Known issues carried forward:**

- None

---

## Sprint 2 — Profile

**Goal:** Users can set up and edit their profile. Any visitor can view an artist's public profile page. Commission availability is toggleable.

**Completed:**

- Profile row created automatically on registration via BetterAuth `databaseHooks`
- Profile setup view (two-step form: identity → details)
- Profile edit view with profile image upload
- Public profile page at `/:username` visible to any visitor
- Commission availability toggle
- Cloudinary direct upload with server-signed URLs
- tRPC procedures set up
- Vitest unit tests for all profile procedures with mocked DB
- Playwright E2E tests for setup, public visit, and edit flows

**Decisions:**

- Direct Cloudinary upload over server-proxied upload to avoid large file handling on Express
- Two-step setup form to reduce onboarding friction
- Profile image excluded from setup, available only in edit view
- Mocked DB for Vitest unit tests, real DB integration tests deferred to Sprint 9
- `profileImageUrl` stored as URL only, `publicId` not stored — orphaned images from cancelled edits accepted as a known trade-off given small file sizes
- e2e file moved from `/client` to root for better project structure

**Issues resolved:**

- `shared/tsconfig.json` incompatible with server project references — resolved by aligning both to `NodeNext` and adding `references` to server config
- `@artfolio/server/*` path alias added to client's `tsconfig.app.json` to avoid using relative paths when importing types from the serer
- `drizzle.config.ts` was missing `casing: 'snake_case'` — DB columns were generated in camelCase while runtime queries expected snake_case, causing BetterAuth query failures

**Known issues carried forward:**

- `edit button hidden from visitors` Playwright test visits a non-existent profile rather than a real one — acceptable for now, revisit in Sprint 9 with seed DB
- Cloudinary cleanup on account deletion not yet implemented

---

## Sprint 3 — Posts (Part 1) + Color Theming

**Goal:** Users can create posts with multiple images and tags, under one category. Profile page derives accent colors from the user's profile image.

**Completed:**

- Post, post_image, category, tag, post_tag tables created and migrated
- Categories seeded (10 fixed options, safe to re-run)
- Shared Zod schemas for post creation and retrieval
- `getImageColors` + `getProfilePalette` for Cloudinary color extraction
- Necessary tRPC procedures defined
- `usePostImageUpload` composable with local preview + upload-on-submit pattern
- `PostCreateView.vue` with image grid, drag-and-drop reorder, tag chips
- `ProfileView.vue` reworked to sidebar + post grid layout
- `PostGrid.vue` with justified layout, hover overlay, accent gradient
- Vitest unit tests for all post procedures
- `useProfilePalette` composable with saturation-based accent picking
- CSS custom properties (`--pa-h/s/l`, `--pa-ring-l`) injected into `ProfileView.vue` with neutral grey fallback
- Sidebar radial gradient, accent ring, accent border, accent badge, accent button hovers
- Playwright E2E for post creation flow with category seeding in `globalSetup`

**Decisions:**

- Removed eager cloudinary upload on file selection in `ProfileImageUpload.vue` and `ProfileEditView.vue`; now, images are uploaded on form submission
- Removed title on posts — description only
- One category per post, many tags

**Issues resolved:**

- PostGrid prop types derived from `inferRouterOutputs<AppRouter>` to match tRPC wire types
- E2E category select timing on CI — fixed by seeding categories in `globalSetup`
- Cloudinary env vars missing from CI workflow — added as GitHub secrets

**Known issues carried forward:**

- `edit button hidden from visitors` Playwright test visits a non-existent profile rather than a real one — acceptable for now, revisit in Sprint 9 with seed DB
- Cloudinary cleanup on account deletion not yet implemented

---

## Sprint 4 — Posts (Part 2) + Post Detail View

**Goal:** Users can edit and delete their posts. Any visitor can view a full post detail modal overlay.

**Completed:**

- New Zod schemas added to shared schemas
- `getById`, `update`, `delete` procedures created
- `deleteImage` added to Cloudinary lib
- Vitest unit tests for all new and existing procedures
- `usePostImageEdit` composable with `ExistingImage | PendingImage` union type
- `PostDetailModal.vue` — full-screen 80/20 overlay, backdrop blur, scroll lock, keyboard nav, prev/next navigation
- `PostEditView.vue` at /posts/:id/edit
- `AppHeader.vue` and `AppFooter.vue` created
- Delete account danger zone section in `ProfileEditView.vue`
- Playwright E2E tests for modal, edit, delete, and non-owner guard flows

**Decisions:**

- Post detail implemented as a full-screen modal rather than a separate route
- Full image replace strategy on update — delete all existing `post_image` rows and reinsert, simpler than diffing
- Cloudinary cleanup is always fire-and-forget, never blocks the DB transaction
- Post ownership guard lives in router `beforeEnter`, not in the component — user never sees the edit form if they're not the owner
- Modal-behind-grid double-match: always scope text assertions to `modal.locator(...)` rather than `page.getByText(...)`

**Issues resolved:**

- `getByText('Second post')` matching two elements, fix: scope to modal
- `secondAuth` fixture added for multi-user E2E tests via `createAuthFixture` factory, as there was no logic in place for testing with more than one user

**Known issues carried forward:**

- `edit button hidden from visitors` Playwright test visits a non-existent profile rather than a real one — acceptable for now, revisit in Sprint 9 with seed DB
- Cloudinary cleanup on account deletion not yet implemented

---

## Sprint 5 — Feed

**Goal:** Signed-in users see a chronological feed. New users see discovery posts. Feed is limited with a 'Load more' button.

**Completed:**

- New types added to shared schemas
- Created `getFeed` procedure, which uses cursor-based pagination and limit + 1 trick for next page detection
- `FeedCard.vue` — card component with minimal post data and placeholder user actions (like, comment, bookmark)
- `FeedView.vue` at `/` — single column layout, discovery banner for guests, load more button, reuses `PostDetailModal.vue`
- `superjson` added to both server and client for proper Date serialization over tRPC
- Vitest unit tests for `getFeed` — 6 cases covering pagination, cursor forwarding, shape mapping, empty state, public access
- Playwright E2E tests — guest discovery banner, signed-in banner absence, modal open, load more absence on single page
- Refactored `PostDetailModal.vue` and `ProfileView.vue` into multiple standalone components

**Decisions:**

- Feed and discovery are the same query — personalisation deferred to follows sprint
- Cursor-based pagination using `createdAt` ISO string as cursor
- `feed.ts` procedure kept separate from `post.ts`; `explore.ts` will follow the same pattern in two sprints
- Sign out and sign in now redirects to `/` instead of `/auth/sign-in`
- Cloudinary image cleanup on profile-image update (fire-and-forget, same pattern as post cleanup)
- Cloudinary profile-image + all post images cleanup on account deletion via `deleteAccount` procedure
- Vitest unit tests added for `profile.update` and `profile.deleteAccount`
- Replaced manual OTP digit input implementation with shadcn-vue `InputOTP` component
- Moved `beforeEnter` guard logic to feed route for faster first navigation

**Issues resolved:**

- `coverImage` typed as `T | undefined` from array index — fixed with non-null assertion (`images[0]!`) in both `getByUsername` and `getFeed` mappers
- `Date` fields serializing as strings over tRPC — fixed by adding `superjson` transformer to server init and `httpBatchLink`
- E2E tests uploading to real Cloudinary cloud — fixed by swapping to test cloud credentials in `server/.env` during E2E runs (real credentials commented out)
- Disabled all image interactions (remove, drag, drop zone, hover styles) during post submit
- Fixed flaky e2e tests on post modal opening

**Known issues carried forward:**

- `edit button hidden from visitors` Playwright test visits a non-existent profile rather than a real one — acceptable for now, revisit in Sprint 9 with seed DB
- No Cloudinary `publicId` stored on profile table — cleanup relies on `extractPublicId` parsing the URL, which is fragile if Cloudinary URL format changes. Consider adding a `profileImagePublicId` column in a future sprint

---

## Sprint 6 — Engagement

**Goal:** Users can like, bookmark, and comment on posts.

**Completed:**

- DB schema: `like`, `bookmark`, `comment` tables with composite PKs on like/bookmark, cascade deletes
- Shared zod schemas implemented
- `engagement.router.ts` router set up
- `getById` and `getFeed` extended with eager-loaded likes/bookmarks/comments, engagement counts and viewer state resolved in JS
- `useEngagement.ts` composable with optimistic updates and rollback on error
- `FeedCard.vue`: live like/bookmark/comment counts, interactive buttons, guest redirect to sign in
- `PostSidebar.vue`: like/bookmark wired via `useEngagement.ts`, full comment thread with `useInfiniteQuery` load more, create and delete comments, guest sign in prompt
- `PostDetailModal.vue` refactored into `PostImages.vue` + `PostSidebar.vue`
- Per-post comment draft preservation in parent via `commentBodies` record
- Vitest unit tests for all engagement procedures, updated `getById` and `getFeed` tests
- Playwright E2E tests implemented

**Decisions:**

- Likes: optimistic updates with rollback
- Bookmarks: flat, no collections
- Comments: flat, no threading

**Issues resolved:**

- `fetchNextPage` type mismatch on `@click` — wrapped in `() => fetchNextPage()`

**Known issues carried forward:**

- `edit button hidden from visitors` Playwright test visits a non-existent profile rather than a real one — acceptable for now, revisit in Sprint 9 with seed DB
- No Cloudinary `publicId` stored on profile table — cleanup relies on `extractPublicId` parsing the URL, which is fragile if Cloudinary URL format changes. Consider adding a `profileImagePublicId` column in a future sprint
- Like/bookmark/comment counts on feed not updated in real time across tabs — delegated to Sprint 8, as it requires websockets
- Load more comments resets to page 1 after create/delete mutation — acceptable for now
- Follow button is UI-only, not wired — Sprint 7
- Relative timestamps on feed cards hardcoded as "1 day" — needs a `formatRelative` utility

---

## Sprint 7 — Following + Discovery & Search

**Goal:** Users can follow and unfollow artists. Discovery Explore page with search, tag, category and sorting options is functional.

**Completed:**

- Follow/unfollow system — DB schema, server procedures, `useFollow.ts` composable
- Personalised feed — `getFollowingFeed` (posts from followed profiles) + `getExplorePosts` (recency), client-side interleaving every 2nd post
- New users with empty following see explore posts with follow buttons instead of empty state
- Newly created post injected into main feed via Pinia store for current session only, disappears on reload
- Follow button on `FeedCard.vue` (suggested posts only), `PostSidebar.vue` (hidden for post owner), `ProfileSidebar.vue` (with palette accent styling and optimistic follower count)
- `ExploreView.vue` page reusing `PostGrid.vue` with load more
- `ExploreView.vue` page with grid layout, search, trending tag pills, category combobox filter and popular/new sort
- `FeedSidebar.vue` with profile card and latest discussions panel (opens post modal with focused comment positioned first in the comment list)
- `relations.ts` refactor — all Drizzle relations moved out of `post.ts` into dedicated file
- Unit tests for all new procedures: follow, feed, post search, engagement, tag
- E2E tests for follow, explore/search, and discussions flows
- E2E `fixtures.ts` refactored to multi-browser context pattern for independent user sessions

**Decisions:**

- `ProfileGrid.vue` renamed to `PostGrid.vue`, for better reusability
- Follow does not invalidate `['feed', 'following']` on action — feed updates on reload only, avoids posts disappearing mid-session
- Normalised follow state cache (`['follow', profileId]`, `enabled: false`) instead of patching feed cache — single source of truth, shared across multiple components
- No fuzzy search — ILIKE partial match is sufficient; fuzzy deferred until user feedback
- Tag rows in DB are never deleted when removed from a post — orphaned tags are acceptable

- **Issues resolved:**

- `formatRelative` utility using `date-fns` replacing hardcoded "1 day"
- Follow button disappearing after toggle — root cause was feed cache invalidation triggering refetch; fixed by normalised cache pattern
- `getLatestDiscussions` load more showing button incorrectly when remaining comments belong to viewer — `hasMore` verification query added
- Explore hover gradient broken (palette CSS vars not set) — `accentOverlay` prop on `ProfileGrid.vue`, static hsl(0 0% 40% / 0.4) fallback for explore
- Multi-user E2E tests failed on third sign-in due to single shared browser context — fixed by refactoring fixtures to create independent `BrowserContext` per auth fixture
- `edit button hidden from visitors` Playwright test set up and working

**Known issues carried forward:**

- No Cloudinary `publicId` stored on profile table — cleanup relies on `extractPublicId` parsing the URL, which is fragile if Cloudinary URL format changes. Consider adding a `profileImagePublicId` column in a future sprint
- Like/bookmark/comment counts on feed not updated in real time across tabs — delegated to Sprint 8, as it requires websockets
- Load more comments resets to page 1 after create/delete mutation — acceptable for now
- When validation error happens for username when setting up profile, its only shown when submitting during the second step, which is unintuitive
- `getExplorePosts` should suggest based on popularity and tag similarity

---

## Sprint 8 — Chat & Notifications

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
