# MagicAI - TODO / Planned Work

## High Priority - Pre-Launch

### Move Gemini API Key to Backend (Cloud Function)
- **Status:** Deferred until Firebase Blaze plan is activated
- **Why:** API key is currently exposed in frontend code. Must move to Firebase Cloud Function before going live with paying users.
- **What's ready:** Cloud Function code is written in `frontend/functions/src/index.ts` (`analyzeDeckWithAI`). Just needs Blaze plan + deploy.
- **Steps:**
  1. Upgrade Firebase to Blaze plan (pay-as-you-go, free tier still applies)
  2. Set Gemini API key: `firebase functions:config:set gemini.apikey="YOUR_KEY"`
  3. Deploy: `firebase deploy --only functions`
  4. Update `ai-analysis.service.ts` to use `AngularFireFunctions.httpsCallable` instead of direct Gemini SDK
  5. Remove `@google/generative-ai` from frontend `package.json`
  6. Remove `geminiApiKey` from environment files

### Set Up Business Email
- **Status:** Blocked by Gmail phone number limit
- **Why:** Need separate emails for Deck & Dice Studios (business) and MagicAI (app)
- **Solution:** Purchase a domain and use Google Workspace or domain email forwarding
- **Options:**
  - `admin@magicai.com.au` / `admin@deckdicestudios.com.au`
  - Google Workspace (~$7/month) or free domain email forwarding

### Set Up Sentry Error Tracking
- **Status:** Waiting for business email to create account
- **What:** Install `@sentry/angular` and wire into app bootstrap
- **Gated by:** `errorTracking` feature flag (already exists)

### Stripe Payment Integration
- **Status:** Not started
- **Requires:** ABN registration, business email, Stripe account
- **Subscription tiers planned:** Free ($0), Premium ($4.99/mo), Pro ($9.99/mo)
- **Steps:**
  1. Register ABN
  2. Set up Stripe account with business email
  3. Create subscription products in Stripe dashboard
  4. Build checkout flow in Angular
  5. Add webhook handling via Cloud Function (requires Blaze plan)
  6. Gate premium features behind subscription status

## Medium Priority - Post-Launch

### AI Deck Builder (Real-time Suggestions)
- **Status:** Feature flag exists (`aiDeckBuilder`), not implemented
- **What:** AI suggests cards as users build decks
- **Concern:** Many API calls per session, high cost. Defer until revenue covers it.

### AI Meta Predictor
- **Status:** Feature flag exists (`aiMetaPredictor`), not implemented
- **What:** AI predictions for meta shifts
- **Reality check:** LLMs can't reliably predict meta without structured tournament data. Consider scraping MTG tournament results instead.

### Google AdSense (Real Ads)
- **Status:** Placeholder components exist, no real ad unit IDs
- **Requires:** AdSense account approval (needs business email, live traffic)
- **Steps:**
  1. Apply for AdSense with business email
  2. Replace placeholder ad unit IDs with real ones
  3. Test ad rendering on live site

### Deck Versioning
- **Status:** Feature flag exists (`deckVersioning`), not implemented
- **What:** Track changes to decks over time, diff between versions
- **Most valuable experimental feature for future implementation

## Low Priority - Future

### Performance Monitoring
- **Status:** Feature flag exists (`performanceMonitoring`), not implemented
- **When:** After gaining enough traffic to identify meaningful patterns

### Offline Mode
- **Status:** Feature flag exists (`offlineMode`), not implemented
- **What:** Service worker + IndexedDB for offline deck viewing
- **When:** After core features are stable and monetized

### Advanced Search
- **Status:** Feature flag exists (`advancedSearch`), not implemented
- **What:** Multi-filter card search (by color, type, CMC, rarity, etc.)

### Bulk Operations
- **Status:** Feature flag exists (`bulkOperations`), not implemented
- **What:** Import/export multiple decks, batch operations

## Completed

### Google Analytics (GA4) Integration
- **Date:** Jan 2025
- **What:** GA4 tracking for page views, logins, signups, deck analysis, deck generation, deck saving, format changes
- **Gated by:** `analyticsEnabled` feature flag
- **Measurement ID:** G-4735NHT3QW

### AI Deck Analysis (Frontend - Dev Mode)
- **Date:** Jan 2025
- **What:** Gemini 2.0 Flash integration calling directly from Angular
- **Gated by:** `aiAnalysis` feature flag
- **Note:** Must move to Cloud Function before production (see High Priority above)

### Project Relocation
- **Date:** Jan 2025
- **What:** Moved from `c:\Project\technologies\angular\projects\active\MagicAI` to `c:\Project\projects\MagicAI`

### Deck Builder Improvements
- **Date:** Jan 2025
- **What:** Random deck generation with varied quantities, random page numbers for alphabet diversity, clear/reset behavior fixes

---
*Last updated: January 2025*
