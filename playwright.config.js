// Run order: `npm run emu` (leave running) -> `npm run seed` -> `npm run e2e`.
// The suite expects the Firebase emulators already running AND seeded; it does not start or seed
// them itself. workers: 1 because tests/e2e/admin.spec.js's soft-delete test mutates seed data
// (history/h1) — specs must run serially, one file/test at a time, not in parallel workers.
//
// `projects` with `dependencies` (rather than plain alphabetical file discovery) forces
// public.spec.js's draft-isolation assertions to run to completion before admin.spec.js's
// soft-delete test runs — admin.spec.js sorts before public.spec.js alphabetically, and its
// soft-delete test permanently marks history/h1 deleted for the rest of the run, which would
// otherwise poison public.spec.js's "drafts and hidden rows never render publicly" count.
//
// Phase 2–4 adds three more public-page spec files (donate/transparency/live) to the 'public'
// project — none of them mutate seed data that other public specs assert on (live.spec.js posts
// a new, unpinned announcement, which never disturbs its own "pinned first" assertion because
// that assertion runs before the post, and no other public spec touches announcements) — then a
// 'members' project (phone OTP; reads/writes nothing another project depends on) between 'public'
// and 'admin', per the plan: public → members → admin, since admin's soft-delete test mutates
// seed data and must run last.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 30000, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:5500', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npm run serve', url: 'http://127.0.0.1:5500/index.html', reuseExistingServer: true },
  projects: [
    { name: 'public', testMatch: /(public|donate|transparency|live)\.spec\.js/ },
    { name: 'members', testMatch: /members\.spec\.js/, dependencies: ['public'] },
    { name: 'admin', testMatch: /admin\.spec\.js/, dependencies: ['members'] },
  ],
});
