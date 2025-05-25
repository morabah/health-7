# Login Credentials Reference

## Default Password for All Users

**Password**: `Password123!`

All users in the system have been synchronized with Firebase Authentication using this default password.

## Available Test Users

### Admin Users
- **Email**: `admin@example.com`
- **Password**: `Password123!`
- **User Type**: Admin
- **UID**: `admin-1odsk03suhp9odjbe13fr8`

### Doctor Users
- **Email**: `user1@demo.health` (Active)
- **Email**: `user2@demo.health` (Active)
- **Email**: `user3@demo.health` (Active)
- **Email**: `user4@demo.health` (Active)
- **Email**: `user5@demo.health` (Active)
- **Email**: `user6@demo.health` (Active)
- **Email**: `user0@demo.health` (Disabled)
- **Email**: `morabahdr@gmail.com` (Active)
- **Email**: `morabahbb@gmail.com` (Active)
- **Password**: `Password123!` (for all)
- **User Type**: Doctor

### Patient Users
- **Email**: `user7@demo.health` (Active)
- **Email**: `user8@demo.health` (Active)
- **Email**: `user9@demo.health` (Active)
- **Email**: `morabah@gmail.com` (Active)
- **Password**: `Password123!` (for all)
- **User Type**: Patient

## Authentication Status

✅ **All 14 users are synchronized with Firebase Authentication**
✅ **All users use the same password: `Password123!`**
✅ **Authentication is working correctly**
✅ **Custom claims and roles are properly set**

## Testing Verified

- Login tests pass for all users with correct password
- Invalid credentials are properly rejected
- User types and claims are correctly configured
- Email verification status matches database

## Important Notes

1. **Case Sensitivity**: The password is case-sensitive: `Password123!`
2. **Special Characters**: Make sure to include the exclamation mark `!`
3. **No Spaces**: Do not include any leading or trailing spaces
4. **Development Only**: This is for development/testing purposes only

## Quick Test Commands

- `npm run auth:verify:firebase` - Verify all users
- `npm run test:login:user` - Test login functionality
- `npm run auth:sync:firebase` - Re-sync if needed

## Last Updated

Authentication sync completed and verified on: 2025-05-25T12:30:00Z 