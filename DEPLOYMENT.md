# 5CSwipe Deployment Guide

Complete guide for deploying 5CSwipe to web, iOS, and Android platforms.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Web Deployment (Vercel)](#web-deployment-vercel)
4. [iOS Deployment](#ios-deployment)
5. [Android Deployment](#android-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] Expo account (https://expo.dev)
- [ ] Vercel account (for web deployment)
- [ ] Apple Developer account ($99/year, for iOS)
- [ ] Google Play Developer account ($25 one-time, for Android)
- [ ] Supabase project (production instance)

### Required Tools
```bash
# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI
npm install -g eas-cli

# Install Vercel CLI (optional)
npm install -g vercel
```

---

## Environment Setup

### 1. Development Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your development credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
EXPO_PUBLIC_PYTHON_API_URL=http://localhost:8085
EXPO_PUBLIC_ENV=development
```

### 2. Production Environment

Create `.env.production` with production credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
EXPO_PUBLIC_PYTHON_API_URL=https://api.5cswipe.com
EXPO_PUBLIC_ENV=production
```

**⚠️ NEVER commit `.env` or `.env.production` to git!**

---

## Web Deployment (Vercel)

### Initial Setup

1. **Install Vercel CLI (optional)**
   ```bash
   npm install -g vercel
   ```

2. **Connect Repository to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Configure Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables, add:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
   EXPO_PUBLIC_PYTHON_API_URL=https://api.5cswipe.com
   EXPO_PUBLIC_ENV=production
   ```

4. **Deploy**

   Vercel automatically deploys on:
   - Push to `main` branch → Production
   - Pull requests → Preview deployments

### Manual Deploy

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Custom Domain

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `5cswipe.com`)
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

---

## iOS Deployment

### Prerequisites

- Mac with Xcode installed
- Apple Developer account
- Enrolled in Apple Developer Program

### 1. Initial EAS Setup

```bash
# Login to Expo
expo login

# Login to EAS
eas login

# Configure EAS for iOS
eas build:configure
```

### 2. Update eas.json

Edit `eas.json` submit section:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

### 3. Build for iOS

```bash
# Development build (for testing on simulator)
eas build --platform ios --profile development

# Preview build (for TestFlight)
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

### 4. Submit to App Store

```bash
# Automatically submit to App Store Connect
eas submit --platform ios --profile production

# Or manually upload the .ipa file to App Store Connect
```

### 5. TestFlight Beta Testing

1. Go to App Store Connect
2. Navigate to your app → TestFlight
3. Add internal testers (up to 100)
4. Add external testers (requires app review)

---

## Android Deployment

### 1. Generate Keystore

```bash
# Generate signing key
keytool -genkeypair -v -storetype PKCS12 \
  -keystore 5cswipe-release.keystore \
  -alias 5cswipe \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Save keystore credentials securely!
```

### 2. Configure EAS Secrets

```bash
# Add keystore to EAS
eas secret:create --scope project --name ANDROID_KEYSTORE \
  --type file --value ./5cswipe-release.keystore

# Add keystore password
eas secret:create --scope project --name ANDROID_KEYSTORE_PASSWORD \
  --value "your-keystore-password"

# Add key alias
eas secret:create --scope project --name ANDROID_KEY_ALIAS \
  --value "5cswipe"

# Add key password
eas secret:create --scope project --name ANDROID_KEY_PASSWORD \
  --value "your-key-password"
```

### 3. Build for Android

```bash
# Development build (APK)
eas build --platform android --profile development

# Preview build (APK for testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### 4. Submit to Google Play

```bash
# Setup service account
# 1. Create service account in Google Cloud Console
# 2. Download JSON key
# 3. Grant access in Google Play Console

# Submit to Google Play
eas submit --platform android --profile production
```

### 5. Internal Testing Track

1. Go to Google Play Console
2. Navigate to Testing → Internal testing
3. Upload your AAB
4. Add testers by email
5. Share the opt-in URL with testers

---

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/ci.yml` automatically runs on:
- Push to `main` branch
- Push to `claude/**` branches
- Pull requests to `main`

### Jobs

1. **Lint** - Code quality check
2. **Type Check** - TypeScript validation
3. **Test** - Run Jest tests with coverage
4. **Build Web** - Verify web build works

### Required GitHub Secrets

Add these in GitHub Settings → Secrets and variables → Actions:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_PYTHON_API_URL
CODECOV_TOKEN (optional, for coverage reports)
```

### Branch Protection Rules

Recommended settings for `main` branch:
- ✅ Require pull request reviews (1 minimum)
- ✅ Require status checks to pass
  - lint
  - typecheck
  - test
- ✅ Require branches to be up to date
- ✅ Include administrators

---

## Monitoring & Maintenance

### Error Monitoring

**Option 1: Sentry**
```bash
npm install --save @sentry/react-native

# Add to app/_layout.tsx:
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.EXPO_PUBLIC_ENV,
});
```

**Option 2: Bugsnag**
```bash
npm install --save @bugsnag/expo

# Configure in app.json
```

### Analytics

**Expo Analytics (free)**
```bash
npx expo install expo-analytics-segment

# Or use Firebase Analytics
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

### Performance Monitoring

Check performance metrics in:
- Expo Dashboard (https://expo.dev)
- Vercel Analytics
- Google Play Console (Android)
- App Store Connect (iOS)

---

## Troubleshooting

### Common Issues

#### Build Fails - Missing Environment Variables

**Problem:** Build fails with "environment variable not found"

**Solution:**
```bash
# For EAS builds, set secrets:
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://your-project.supabase.co"

# For GitHub Actions, add to repository secrets
```

#### iOS Build Certificate Issues

**Problem:** "No valid code signing certificate"

**Solution:**
```bash
# Let EAS manage certificates
eas credentials

# Or manually configure in eas.json:
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "remote"
      }
    }
  }
}
```

#### Android Build Keystore Error

**Problem:** "Could not find keystore file"

**Solution:**
```bash
# Verify keystore is uploaded
eas secret:list

# Re-upload if missing
eas secret:create --scope project --name ANDROID_KEYSTORE \
  --type file --value ./path/to/keystore
```

#### Web Build Out of Memory

**Problem:** "JavaScript heap out of memory"

**Solution:**
```bash
# Increase Node memory limit
NODE_OPTIONS=--max_old_space_size=4096 npx expo export:web
```

#### Tests Failing in CI

**Problem:** Tests pass locally but fail in CI

**Solution:**
```bash
# Run tests with CI flag locally
npm run test:ci

# Check for timing issues or environment dependencies
```

### Getting Help

- **Expo Forums:** https://forums.expo.dev
- **Discord:** https://chat.expo.dev
- **GitHub Issues:** File bug reports in the repository
- **Stack Overflow:** Tag questions with `expo`, `react-native`, `supabase`

---

## Deployment Checklist

### Before First Deploy

- [ ] Test app thoroughly on web, iOS simulator, Android emulator
- [ ] Run full test suite: `npm test`
- [ ] Check TypeScript: `npx tsc --noEmit`
- [ ] Run linter: `npm run lint`
- [ ] Update version in `app.json`
- [ ] Update `CHANGELOG.md` (if exists)
- [ ] Tag release in git: `git tag v1.0.0`

### Web Deployment

- [ ] Set production environment variables in Vercel
- [ ] Test web build locally: `npx expo export:web`
- [ ] Deploy to Vercel
- [ ] Verify deployment at production URL
- [ ] Test critical user flows (signup, login, swipe, schedule)

### iOS Deployment

- [ ] Update version and build number in `app.json`
- [ ] Build with `eas build --platform ios --profile production`
- [ ] Submit to App Store with `eas submit`
- [ ] Test on real device via TestFlight
- [ ] Submit for App Review
- [ ] Wait for approval (1-3 days typically)

### Android Deployment

- [ ] Update version code and name in `app.json`
- [ ] Build with `eas build --platform android --profile production`
- [ ] Submit to Play Store with `eas submit`
- [ ] Test on real device via Internal Testing
- [ ] Promote to Beta/Production track
- [ ] Wait for review (typically faster than iOS)

---

## Rollback Procedures

### Web (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "⋯" → "Promote to Production"

### iOS (App Store)

1. Go to App Store Connect
2. Navigate to your app
3. Remove current version from sale
4. Re-submit previous version

### Android (Google Play)

1. Go to Google Play Console
2. Navigate to Production track
3. Create new release with previous AAB
4. Or halt rollout of current version

---

## Security Best Practices

- ✅ Never commit `.env` files
- ✅ Rotate API keys regularly
- ✅ Use environment-specific Supabase projects
- ✅ Enable Row Level Security (RLS) in Supabase
- ✅ Implement proper error handling (don't expose secrets)
- ✅ Use HTTPS only in production
- ✅ Enable Content Security Policy headers
- ✅ Regular dependency updates: `npm audit fix`

---

## Support

For deployment assistance, contact:
- **Developer:** Will Hammond
- **Email:** [your-email]
- **GitHub:** willhammondhimself/5CSwipe

---

**Last Updated:** November 2024
**Version:** 1.0.0
