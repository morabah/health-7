# Health Appointment System - Firebase Functions

This directory contains the Firebase Cloud Functions for the Health Appointment System. These functions handle backend logic, authentication, and database operations.

## Prerequisites

- Node.js 18 or later
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project set up in the [Firebase Console](https://console.firebase.google.com/)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Firebase Admin SDK (get from Firebase Console > Project Settings > Service accounts)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="your-private-key"

   # Environment
   NODE_ENV=development
   ```

3. **Login to Firebase**
   ```bash
   firebase login
   ```

4. **Link to Firebase Project**
   ```bash
   firebase use --add
   ```
   Select your Firebase project when prompted.

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch for changes and recompile
- `npm run serve` - Start the local emulator
- `npm run deploy` - Deploy functions to Firebase
- `npm run test` - Run tests
- `npm run lint` - Lint the codebase
- `npm run format` - Format the code using Prettier

### Local Development

1. Start the Firebase Emulator Suite:
   ```bash
   firebase emulators:start
   ```

2. The emulator UI will be available at: http://localhost:4000

## Project Structure

```
src/
├── index.ts              # Main entry point for Firebase Functions
├── server.ts             # Express server implementation
├── types/                # TypeScript type definitions
│   └── index.ts
├── utils/                # Utility functions
│   └── apiError.ts       # Error handling utilities
└── __tests__/            # Test files
```

## Authentication

Authentication is handled by Firebase Authentication. The following user roles are supported:

- `patient` - Regular users who can book appointments
- `doctor` - Healthcare providers who can manage their schedule
- `admin` - Administrative users with full access

## API Endpoints

### Authentication

- `POST /api/register` - Register a new user
- `POST /api/login` - Authenticate a user
- `POST /api/refresh-token` - Refresh authentication token

### Appointments

- `GET /api/appointments` - Get user's appointments
- `POST /api/appointments` - Create a new appointment
- `PUT /api/appointments/:id` - Update an appointment
- `DELETE /api/appointments/:id` - Cancel an appointment

### Users

- `GET /api/users/me` - Get current user's profile
- `PUT /api/users/me` - Update current user's profile
- `GET /api/users/doctors` - List all doctors (for patients)

## Error Handling

All API errors follow the same format:

```json
{
  "success": false,
  "error": {
    "code": "error-code",
    "message": "Human-readable error message",
    "details": {
      // Additional error details (optional)
    }
  }
}
```

## Testing

Tests are written using Jest. To run tests:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy --only functions
   ```

   Or for production:
   ```bash
   npm run deploy:prod
   ```

## Monitoring

View function logs in the Firebase Console or using the Firebase CLI:

```bash
firebase functions:log
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Write tests for your changes
4. Ensure all tests pass
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
