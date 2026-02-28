# MagicAI React - Development Roadmap

*Last updated: February 2026*

---

## Completed

### Core Platform
- [x] React 18 + TypeScript + Vite frontend
- [x] Firebase Auth (Google + email/password)
- [x] Firestore cloud storage (decks, user profiles, collection)
- [x] Firebase Hosting deployment
- [x] Scryfall API integration for card data
- [x] Responsive dark-mode UI

### Deck Builder
- [x] Drag-and-drop deck building with card search
- [x] Format validation (Standard, Modern, Pioneer, Commander, etc.)
- [x] AI deck generation via Gemini 2.0 Flash
- [x] Card scanner (camera-based card recognition)
- [x] Import/export (text, Arena, MTGO formats)
- [x] Save/load decks to Firestore
- [x] Deck stats panel (mana curve, color distribution, type breakdown)

### Deck Analysis
- [x] AI-powered deck analysis via Gemini
- [x] Mana curve analysis and recommendations
- [x] Format legality checking
- [x] Card type distribution
- [x] Archetype identification

### Collection Tracker
- [x] Firestore subcollection per user (scales to thousands of cards)
- [x] Add cards via Scryfall search
- [x] Bulk import (paste card list)
- [x] Collection stats (value, color distribution, rarity, condition)
- [x] Search, filter, sort collection
- [x] Card detail editing (quantity, foil, condition)
- [x] Condition-adjusted value estimation
- [x] AI "Build Deck from Collection" (Gemini) - opens in Deck Builder
- [x] Firestore security rules for collection subcollection
- [x] Profile stats integration (deck count, collection count, credits)

### User Features
- [x] User profiles with avatar, bio, customization
- [x] Credit system for AI features
- [x] Admin panel
- [x] Google Analytics (GA4) tracking
- [x] Public/private deck sharing
- [x] Dashboard with quick actions
- [x] My Decks page
- [x] Explore public decks

---

## High Priority - Pre-Launch

### Move Gemini API Key to Backend
- **Status:** Deferred until Firebase Blaze plan
- **Why:** API key is exposed in frontend code - security risk for production
- **Ready:** Cloud Function code written in `frontend/functions/src/index.ts`
- **Steps:**
  1. Upgrade Firebase to Blaze plan (pay-as-you-go)
  2. Set API key: `firebase functions:config:set gemini.apikey="YOUR_KEY"`
  3. Deploy: `firebase deploy --only functions`
  4. Update frontend to call Cloud Function instead of direct Gemini API
  5. Remove API key from frontend environment

### Stripe Payment Integration
- **Status:** Not started
- **Requires:** ABN registration, business email, Stripe account
- **Tiers:** Free ($0), Premium ($4.99/mo), Pro ($9.99/mo)
- **Steps:**
  1. Register ABN
  2. Set up Stripe account
  3. Create subscription products in Stripe dashboard
  4. Build checkout flow in React
  5. Add webhook handling via Cloud Function (requires Blaze plan)
  6. Gate premium features behind subscription status

### Business Email Setup
- **Status:** Blocked by Gmail phone number limit
- **Solution:** Purchase domain + Google Workspace or domain email forwarding
- **Needed for:** Stripe, Sentry, AdSense, legal docs

### Sentry Error Tracking
- **Status:** Waiting for business email
- **What:** Install `@sentry/react`, wire into app error boundary
- **Gated by:** `errorTracking` feature flag (already exists)

---

## Medium Priority - Post-Launch

### Google AdSense (Real Ads)
- **Status:** Placeholder components exist, no real ad unit IDs
- **Requires:** AdSense account approval (needs business email, live traffic)

### AI Real-Time Suggestions
- **Status:** Feature flag exists (`aiDeckBuilder`)
- **What:** AI suggests cards as users build decks in real-time
- **Concern:** High API cost per session - defer until revenue covers it

### Deck Versioning
- **Status:** Feature flag exists (`deckVersioning`)
- **What:** Track changes to decks over time, diff between versions

### AI Meta Predictor
- **Status:** Feature flag exists (`aiMetaPredictor`)
- **What:** AI predictions for meta shifts based on tournament data

---

## Lower Priority - Future

### Progressive Web App (PWA)
- Installable on mobile devices
- Offline deck viewing via service worker + IndexedDB

### Community Features
- Deck ratings and reviews
- Comments on public decks
- Follow system for deck builders
- Tournaments and events

### Advanced Search
- Multi-filter card search across entire Scryfall database
- Saved searches and filters

### Performance Monitoring
- Feature flag exists (`performanceMonitoring`)
- When: after enough traffic to identify patterns

### Marketplace Integration
- Card marketplace with deck-to-purchase links
- Affiliate partnerships with card retailers (TCGPlayer, etc.)

---

## Revenue Targets (Conservative)

| Timeline | Free Users | Premium Subs | Pro Subs | Ad Revenue | Monthly Total |
|----------|-----------|-------------|---------|------------|---------------|
| Month 6  | 200       | 15          | 2       | $150       | ~$245         |
| Month 12 | 1,500     | 75          | 10      | $800       | ~$1,274       |
| Month 24 | 8,000     | 400         | 60      | $4,000     | ~$6,595       |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Firebase (Auth, Firestore, Hosting, Cloud Functions) |
| Card Data | Scryfall API |
| AI | Google Gemini 2.0 Flash |
| Analytics | Google Analytics 4 |
| Payments | Stripe (planned) |
| Error Tracking | Sentry (planned) |
