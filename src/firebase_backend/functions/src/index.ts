/**
 * Firebase Functions Entry Point
 *
 * This file serves as the main entry point for all Firebase Functions.
 * It imports and configures all function handlers.
 */

// Initialize Firebase Admin SDK first
import "./config/firebaseAdmin";

// Import all functions from their respective modules
export { getMyUserProfileData } from './user/getUserProfile'; 