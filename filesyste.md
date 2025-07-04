Crucial Project Filesystem Rules — Reference for every Cursor prompt

#	Path	Type	Purpose / What must live here
1	/ (project root)	dir	Package.json, Next config, .env.*, local_db/ JSON store, scripts/ (seeders, migrations), Git artefacts.
2	/local_db	dir	Flat-file “database” — seeded JSON collections (users.json, patients.json, …). Never commit PII; always in .gitignore.
3	/scripts	dir	All Node/TS CLI helpers (e.g. seedLocalDb.ts, migration tools). Invoked via npm run *.
4	/src	dir	All application TS/TSX source code (no stray files outside).
5	/src/app	dir	Next-js App-Router tree only—no helpers or utils. Route groups:
└─ (public)	dir	Marketing pages (home, about, contact, find-doctors).
└─ (auth)	dir	Auth flow pages (login, register/*, forgot-password, …).
└─ (platform)	dir	All authenticated areas.
- sub-layout patient, doctor, admin, notifications, book-appointment.
└─ (dev)	dir	Dev-only UI (ui-test, cms/validation). Will be stripped in prod build.
└─ not-found.tsx	file	Global 404 fallback.
6	/src/components/ui	dir	Atomic, theme-aware primitives only (Button, Card, Input, Spinner, Alert, Badge, …). No business logic.
7	/src/components/layout	dir	Structural components used site-wide (Navbar, Footer, Layout wrapper).
8	/src/components/auth	dir	Auth helpers visible to UI (e.g. Protected.tsx).
9	/src/context	dir	React context providers only (ThemeContext.tsx, AuthContext.tsx). Each must export its own useX hook.
10	/src/hooks	dir	Reusable client hooks (e.g. TanStack Query wrappers). No UI markup.
11	/src/lib	dir	Pure logic / node-safe utilities.
• logger.ts, performance.ts
• localDb.ts (low-level JSON R/W)
• localApiFunctions.ts (Phase-4 local backend stubs)
• apiClient.ts (flag-switch wrapper for local ↔️ emulator)
12	/src/data	dir	High-level data-loader modules (patientLoaders.ts, doctorLoaders.ts, …). These call apiClient.
13	/src/types	dir	Project-wide types only:
• enums.ts (UserType, AppointmentStatus …)
• schemas.ts (Zod)
• index.ts (re-exports & inferred types).
14	/src/styles	dir	Tailwind base files (globals.css, tailwind.config.ts, etc.). No CSS Modules here.
15	/public/	dir	Static assets (favicons, images); automatically served by Next.
16	/README.md	file	Project overview, setup, script docs—kept up-to-date.
17	/docs/ (optional)	dir	Long-form design docs, ADRs. Build artefacts never imported from code.
🔑 Enforcement Rules

Never import from src/app into src/lib, context, or components/ui. (App-Router must stay top-level only).
No business logic in src/components/ui/*. They are presentation-only.
Every new file must be placed in the table-designated directory that matches its role. If uncertain, default to src/lib (logic) or src/components (UI) and update this rule set.
Do not place .env, DB JSON, or build artefacts inside src/.
All Cloud-Function look-alike names must exist in localApiFunctions.localApi and later in the Firebase functions index; the names must match 1-for-1.
All shared types live in src/types; UI must import them, never re-declare.
local_db is the only place file-writes are permitted outside node_modules during dev.