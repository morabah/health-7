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

# Project Overview & Quick Reference

For comprehensive lessons learned and best practices, see **[Lessons Learned Documentation](docs/history/LESSONS_LEARNED.md)**.

## Quick Reference

### Essential Development Commands
```bash
# Development
npm run dev                     # Start development server
npm run build                   # Build for production

# Database & Authentication
npm run db:seed:local           # Seed local database
npm run auth:sync:firebase      # Sync users with Firebase Auth
npm run test:login:user         # Test login functionality

# Validation & Testing
npm run validate:frontend:*     # Validate frontend configuration
npm run test:frontend:*         # Test frontend functionality
```

### Firebase CLI Project Setup
```bash
firebase login                  # Login to Firebase
firebase projects:list          # List available projects
firebase use health7-c378f      # Set active project
```

### Critical Development Patterns

#### FieldValue Usage (Critical)
```typescript
// ✅ Correct - Direct import
import { FieldValue } from 'firebase-admin/firestore';

// ❌ Incorrect - Never use
admin.firestore.FieldValue.serverTimestamp()
```

#### Automated UID Synchronization
```bash
npm run seed:auth  # Automatically syncs Auth Emulator UIDs with mock data
```

### Environment Configuration
- **Local Development**: Uses local JSON database (`/local_db/`)
- **Cloud Development**: Uses Firebase Firestore and Authentication
- **Environment Variables**: Store in `.env.local` (gitignored)

---

_For detailed lessons learned, implementation patterns, and troubleshooting guides, see [docs/history/LESSONS_LEARNED.md](docs/history/LESSONS_LEARNED.md)._

## Firebase CLI Project Setup & Verification

To ensure the Firebase CLI operates only on the correct development project:

1. **Check Login Status:**
   ```bash
   firebase login
   ```

2. **List Projects:**
   ```bash
   firebase projects:list
   ```

3. **Set Active Project:**
   ```bash
   firebase use health7-c378f
   ```

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
