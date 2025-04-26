This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

---

# Project Memories & Key Lessons Learned

## 1. Firebase Integration & Patterns

### 1.1 Backend & Frontend Integration

- **Data Loader Pattern**: Abstracted loaders handle API calls, loading states, and error handling. Graceful degradation with mock data when emulators aren't available. Track performance, `try`/`catch`/`finally`, and error logging.
- **Firebase Functions Structure**: Cloud Functions organized by domain. Singleton Admin SDK init, enhanced logging, and performance tracking.
- **Emulator Configuration**: Use `127.0.0.1` for emulator hosts to avoid IPv6/IPv4 mismatches. Hardcode `projectId` for emulator tests; use validation scripts to verify connections.
- **Error Handling**: Frontend uses graceful degradation; backend throws `HttpsError` with specific codes and logs detailed context.
- **Testing**: Dedicated test scripts and pages; use `logValidation()` to confirm emulator and function behavior.
- **Common Issues**: CORS via `httpsCallable`, Firestore Timestamp serialization, port conflicts, and strict TypeScript interfaces.
- **Workflow**: Build TypeScript before deploying, verify emulator logs, test functions before integrating UI.

### 1.2 Standardized Firebase Functions Pattern (TypeScript)

- Use `createCallableFunction` / `createAuthenticatedFunction` for type safety, Zod validation, consistent error handling, logging, and performance tracking.
- Validate inputs with Zod; invalid data triggers `HttpsError('invalid-argument')`.
- Log errors with context; throw precise `HttpsError` codes (`invalid-argument`, `unauthenticated`, `permission-denied`, `not-found`, `already-exists`, `internal`).
- Return success as `{ success: true, ...data }`.

### 1.3 Callable Function Payload & Response Handling

- **Payload Unwrapping (Backend)**: Always unwrap the `data` property in helpers:
  ```ts
  const data =
    typeof rawData === 'object' && rawData !== null && 'data' in rawData ? rawData.data : rawData;
  ```
- **Response Shape (Frontend)**: Standardize `callApi` to return `response.data` when present; consumers access:
  ```ts
  const apiResult = await callApi(...);
  const userId = apiResult?.userId ?? apiResult?.data?.userId;
  ```

### 1.4 FieldValue Usage Pattern (Critical Error Avoidance)

- Import `FieldValue` (and `Timestamp`) from `'firebase-admin/firestore'`, never use `admin.firestore.FieldValue`.
- Use `FieldValue.serverTimestamp()` for `createdAt` & `updatedAt`.
- Export only the admin instance, `db`, and `auth` from utility modules.

## 2. Local Environment & Emulator Setup

- **API Key Generation:** Firebase does not generate a Web API Key until you register a web app in the Firebase Console. Always register your local app to obtain the API key and update `.env.local` accordingly.
- **.env.local Management:** Store real API key and project credentials in `.env.local` (gitignored). Restart the dev server after changes to pick up new values.
- **Next.js App Router Routing:** Ensure route files live under `src/app/route-name/page.tsx` (e.g., `src/app/helloWorld-test/page.tsx`). After renaming or moving routes, restart the dev server to reload routing tree.
- **Emulator/Function Validation:** Create dedicated test pages and scripts to validate HTTPS Callable functions end-to-end via the emulator. Confirm expected responses and logs in both browser console and Emulator UI.
- **Error Handling in Local:** 400 errors from the Auth Emulator often indicate placeholder API keys or misconfigured `.env.local`. Host validation/whitelist warnings can be ignored for local testing.
- **General Best Practices:** Always inspect logs in both browser and Emulator UI when troubleshooting. Remove or secure temporary test pages once validation is complete to keep the codebase clean.

## 3. Debugging User Profile Updates & Seeding

- **Data Model Dependency**: Profile updates depend on multiple related Firestore docs (`/users/{uid}`, `/patients/{uid}`, `/doctors/{uid}`). All must exist before updating.
- **Emulator Seeding**: Seeding script must create _all_ necessary docs for test users, including sub-profiles. Incomplete seeding causes runtime errors.
- **Specific Backend Errors**: Functions should catch specific errors (e.g., Firestore gRPC code 5 for NOT_FOUND) and throw specific `HttpsError` codes (`not-found`, `invalid-argument`, etc.), not generic `internal`.
- **Consistent Test User Seeding**: The account used for frontend testing must be included in the seeding script, with all required sub-profiles.
- **Robust Seeding Script**: Should handle pre-existing Auth users by checking/creating any missing Firestore sub-profiles.
- **Mock UID Synchronization Automation:** The `scripts/seed-emulator-users.ts` script now automatically updates the `id` fields in `src/types/mockData.ts` for seeded users (patient, doctor, admin) after each run, replacing the `// AUTO-UPDATED` placeholders. This ensures mock profiles always match the Auth Emulator UIDs and eliminates manual edits and mismatch warnings.

## 4. UI Implementation & Animations

### 4.1 UI Implementation Plan

- **Public Pages**: Homepage (Hero, Features, How It Works, Testimonials), About, Contact.
- **Authentication Pages**: Login, Register choice, Patient & Doctor registration, Forgot/Reset password, Pending verification.
- **Navigation**: Navbar with role-based links, Footer with site links.
- **Tech Stack**: Next.js App Router, React 18, TypeScript strict, Tailwind CSS, Headless UI / Radix Primitives, Font Awesome, Firebase integration via emulator.

### 4.2 Subtle UI Animations

- All UI components (Button, Input, Textarea, Select, Alert, Spinner, Card), Navbar/mobile menu, and modal dialogs implement smooth transitions and subtle hover/focus effects.
- Animations via Headless UI or CSS transitions; validated with `logValidation('3.12', 'success')`.

## 5. Automated Firebase Auth Emulator Seeding & UID Sync

### Usage

To ensure your Firebase Auth Emulator and all frontend/backend test user UIDs are always in sync, use the following npm script:

```bash
npm run seed:auth
```

This script will:

1. Transpile the TypeScript seeding script (`scripts/seed-emulator-users.ts`) to JavaScript.
2. Run the output with Node.js, updating both the Auth Emulator and the UID fields in `src/types/mockData.ts` and `src/types/mock-seeded-uids.json`.

### Why?

- **No more UID mismatch errors:** Ensures all test logins and role-based profile assignments work with no warnings immediately after seeding.
- **One step for all contributors:** No manual edits or complex steps required.
- **Safe for CI/CD:** Works anywhere Node.js and npm are available.

### Best Practice

- Always run `npm run seed:auth` after resetting or reseeding the emulator, or before frontend/backend integration testing.
- Never edit mock UIDs manually; let the script handle all updates.

---

**If you ever see UID mismatch or profile assignment warnings, simply rerun the seeding script to resync everything.**

## Firebase Admin SDK: FieldValue Usage Pattern (Critical Error Avoidance)

**Pattern:**

- Never use `admin.firestore.FieldValue` directly in backend code for serverTimestamp or other sentinel values.
- Always import `FieldValue` (and `Timestamp` if needed) directly from `'firebase-admin/firestore'`:
  ```typescript
  import { FieldValue } from 'firebase-admin/firestore';
  ```
- Use `FieldValue.serverTimestamp()` in all Firestore writes.
- Do not re-export FieldValue from firebaseAdmin.ts; export only the admin instance, db, and auth.
- This avoids runtime errors: `TypeError: Cannot read properties of undefined (reading 'serverTimestamp')` in the emulator or production.

**Scope:**

- Applies to all backend files, especially shared utilities like logger.ts, perf.ts, and any function using Firestore sentinels.
- If you see or review code using `admin.firestore.FieldValue`, refactor it to the above pattern immediately.

**Reason:**

- The static FieldValue property is not always attached to the admin.firestore namespace at runtime due to SDK versioning and bundling. Direct import is always safe and version-agnostic.

**Validation:**

- Build must succeed, emulators must start, and no FieldValue/undefined errors should appear in logs.
- Validate by running logValidation and checking Firestore writes for server timestamps.

**Related Error:**

- TypeError: Cannot read properties of undefined (reading 'serverTimestamp')

**Reference:**

- See logger.ts and related backend files for correct usage.

---

## Timestamp Handling Standard (Backend & Frontend)

## Backend

- All Firestore document creation and updates must use `FieldValue.serverTimestamp()` for `createdAt` and `updatedAt` fields (see FieldValue Usage Pattern above).
- For date fields (e.g., `appointmentDate`), data from the client is converted to Firestore Timestamp objects using `Timestamp.fromDate(new Date(dateString))`.
- All backend functions (user profile creation, update, appointment booking, seeding, etc.) consistently use server-side timestamps.

## Frontend

- All components that display Firestore Timestamps import `Timestamp` from `firebase/firestore`.
- Timestamps are converted to JS Date objects using `.toDate()` before formatting for display.
- Utility functions in `src/utils/dateUtils.ts` provide consistent formatting (`formatTimestamp`, `getRelativeTime`, `formatDateString`).
- Components (`AppointmentCard`, `AppointmentList`, etc.) use these utilities and handle null/undefined gracefully (show 'N/A').
- Comments are included to indicate conversion points.

## Validation

- UI visually displays formatted dates/times for appointments, profiles, etc., fetched from the Firestore Emulator.
- Null/undefined timestamps are handled gracefully (no crashes, show fallback text).
- Pattern is reusable for all new date/time fields in the app.

## Example Pattern

- Backend: `createdAt: FieldValue.serverTimestamp()`, `updatedAt: FieldValue.serverTimestamp()`, `appointmentDate: Timestamp.fromDate(new Date(dateString))`
- Frontend: `const jsDate = timestampObject?.toDate(); // Convert Firestore Timestamp to JS Date for formatting`
- Display: `{appointment.appointmentDate?.toDate().toLocaleDateString()}` or with util: `{formatTimestamp(appointment.appointmentDate)}`

This pattern is now standard for all Firestore timestamp handling in the Health Appointment System.

---

_For full details, see the individual memory records or the project documentation._

## Firebase CLI Project Setup & Verification

To ensure the Firebase CLI operates only on the correct development project (and never on production by accident), follow these steps:

1. **Check Login Status:**

   - Run: `firebase login`
   - If already logged in, the CLI will confirm your account. If not, follow the browser authentication flow.

2. **List Projects:**

   - Run: `firebase projects:list`
   - Confirm your development project ID (e.g., `health-appointment-dev`) is listed.

3. **Set Active Project:**

   - Run: `firebase use health-appointment-dev`
   - The output must explicitly state: `Now using project health-appointment-dev`.

4. **Validation:**

   - The CLI must show your dev project as current in all subsequent commands.
   - For tracking, log validation with:

     ```js
     logValidation(
       '5.3',
       'success',
       'Firebase CLI logged in and targeting dev project: health-appointment-dev'
     );
     ```

     Direct imports are safer: Always import Firebase utility classes like FieldValue directly from their specific modules (firebase-admin/firestore) rather than accessing them through the admin object. This prevents "Cannot read properties of undefined" errors when the property isn't attached at runtime.

     Missing module dependencies: When you see "Module not found" errors in a JavaScript/TypeScript project, it's often because a module is being imported but hasn't been created. Creating the missing file (like we did with logger.js) solves this.

     Utility modules: Creating shared utility files (like logger.js) for common functionality helps maintain consistency across your application.

     TypeScript building: Remember to rebuild TypeScript files after making changes with npm run build before testing.

     CORS Configuration for Seeding HTTP Endpoints: The "Access to fetch blocked by CORS policy" errors show that seeding endpoints need proper CORS headers. Ensure your HTTP functions use the corsHandler middleware consistently.

     Emulator Host Consistency: Use 127.0.0.1 (not localhost) for all emulator hosts to avoid IPv4/IPv6 mismatches. This applies to both backend and frontend connections.

     Authentication for Seeding Functions: Some errors show "Authentication required" - ensure your seeding functions either don't require authentication in the emulator or provide proper authentication tokens.

---
