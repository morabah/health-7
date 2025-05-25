# Firebase Service Account Setup for Local Database Migration

To run the local database migration script (`npm run db:migrate:local-to-cloud-dev`), you need to download a service account key from Firebase Console.

## Steps:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `health7-c378f` (Development)
3. **Navigate to Project Settings**:
   - Click the gear icon ⚙️ next to "Project Overview"
   - Select "Project settings"
4. **Go to Service Accounts Tab**:
   - Click on "Service accounts" tab
5. **Generate Private Key**:
   - Click "Generate new private key" button
   - Confirm by clicking "Generate key"
6. **Download & Place the Key**:
   - A JSON file will be downloaded
   - Rename it to `serviceAccountKey.json`
   - Place it in the **project root** (same directory as package.json)

## Security Note:

- ⚠️ **NEVER commit this file to Git** - it's already in `.gitignore`
- 🔒 This key provides admin access to your Firebase project
- 🗑️ Delete the file when you no longer need it

## Usage:

After placing the key file, run:
```bash
npm run db:migrate:local-to-cloud-dev
```

This will migrate all your local database data to the live Development Cloud Firestore with proper Zod validation and Firestore Timestamp conversion. 