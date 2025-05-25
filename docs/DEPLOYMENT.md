# Deployment Guide

This document covers deployment procedures for the Health Appointment System.

## Overview

The Health Appointment System is deployed using Firebase services with a serverless architecture.

## Quick Reference

### Deployment Commands
```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Environment Configuration
- **Development**: `health7-c378f` project
- **Production**: Separate Firebase project (to be configured)

---

## Firebase Services

### Hosting
- **Service**: Firebase Hosting
- **Domain**: Custom domain configuration
- **SSL**: Automatic HTTPS certificates
- **CDN**: Global content delivery

### Functions
- **Runtime**: Node.js 22
- **Region**: us-central1
- **Memory**: 256MB default
- **Timeout**: 60s default

### Firestore
- **Database**: Multi-region
- **Indexes**: 12 composite indexes
- **Rules**: Role-based security
- **Backup**: Automatic daily backups

### Authentication
- **Providers**: Email/Password
- **Custom Claims**: Role-based permissions
- **Security**: Token validation

---

## Deployment Process

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Environment variables configured
- [ ] Firebase project selected
- [ ] Security rules updated
- [ ] Database indexes created

### Build Process
```bash
npm run build
npm run typecheck
npm run lint
```

### Deployment Steps
1. Build application
2. Deploy Firestore rules and indexes
3. Deploy Cloud Functions
4. Deploy hosting

---

## Environment Configuration

### Development Environment
```bash
firebase use health7-c378f
```

### Production Environment
```bash
firebase use production-project-id
```

---

## Related Documents

- [Architecture Overview](../ARCHITECTURE.md)
- [Development Workflow](../DEVELOPMENT.md)
- [Authentication System](../AUTHENTICATION.md)

*Note: This is a placeholder document. Full deployment documentation will be expanded as deployment procedures are finalized.* 