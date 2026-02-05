/**
 * Tier Configuration
 * Central source of truth for subscription tiers, features, and pricing
 */

// Subscription tier types
export type SubscriptionTier = 'free' | 'pro' | 'premium'

// Feature keys for access control
export type FeatureKey =
  | 'simpleAnalysis'
  | 'fullAnalysis'
  | 'deckGeneration'
  | 'cameraScanner'
  | 'exportMTGA'
  | 'exportMoxfield'
  | 'publicSharing'
  | 'unlimitedDecks'
  | 'prioritySupport'
  | 'earlyAccess'
  | 'creditRollover'

// Credit costs for AI features
export const CREDIT_COSTS: Record<string, number> = {
  simpleAnalysis: 1,
  fullAnalysis: 2,
  deckGeneration: 5,
}

// Max decks per tier
export const MAX_DECKS: Record<SubscriptionTier, number> = {
  free: 3,
  pro: 20,
  premium: Infinity, // Unlimited
}

// Credit rollover limits
export const CREDIT_ROLLOVER: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 50,
  premium: 150,
}

// Feature access matrix
export const FEATURE_ACCESS: Record<FeatureKey, SubscriptionTier[]> = {
  // Available to all
  simpleAnalysis: ['free', 'pro', 'premium'],
  cameraScanner: ['free', 'pro', 'premium'],

  // Pro and above
  fullAnalysis: ['pro', 'premium'],
  deckGeneration: ['pro', 'premium'],
  exportMTGA: ['pro', 'premium'],
  exportMoxfield: ['pro', 'premium'],
  publicSharing: ['pro', 'premium'],

  // Premium only
  unlimitedDecks: ['premium'],
  prioritySupport: ['premium'],
  earlyAccess: ['premium'],
  creditRollover: ['pro', 'premium'],
}

// Tier hierarchy for comparison (higher = better)
export const TIER_LEVEL: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  premium: 2,
}

// Full tier definitions
export interface TierDefinition {
  id: SubscriptionTier
  name: string
  price: number // Monthly price in dollars
  priceDisplay: string
  credits: number
  creditsLabel: string
  perCredit: number // Price per credit
  features: string[] // Human-readable feature list
  lockedFeatures?: string[] // Features locked for this tier
}

export const TIER_DEFINITIONS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: '$0',
    credits: 10,
    creditsLabel: '10 credits (one-time)',
    perCredit: 0,
    features: [
      '10 AI credits to start',
      'Simple card analysis',
      'Up to 3 saved decks',
      'Basic deck builder',
      'Camera scanner',
    ],
    lockedFeatures: [
      'Full AI analysis',
      'AI deck generation',
      'Export to MTGA/Moxfield',
      'Public deck sharing',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 7.99,
    priceDisplay: '$7.99/mo',
    credits: 120,
    creditsLabel: '120 credits/month',
    perCredit: 0.067,
    features: [
      '120 AI credits/month',
      'Full AI analysis',
      'AI deck generation',
      'Up to 20 saved decks',
      'Export to MTGA/Moxfield',
      'Public deck sharing',
      'Camera scanner',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    priceDisplay: '$14.99/mo',
    credits: 300,
    creditsLabel: '300 credits/month',
    perCredit: 0.05,
    features: [
      '300 AI credits/month',
      'All Pro features',
      'Unlimited saved decks',
      'Priority support',
      'Early access to features',
      'Credit rollover (max 150)',
    ],
  },
}

// Top-up package definitions
export interface TopupPackage {
  credits: number
  price: number
  priceDisplay: string
  perCredit: number
  deckGenerations: number // Approximate deck generations
}

export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    credits: 15,
    price: 1.99,
    priceDisplay: '$1.99',
    perCredit: 0.13,
    deckGenerations: 3,
  },
  {
    credits: 40,
    price: 3.99,
    priceDisplay: '$3.99',
    perCredit: 0.10,
    deckGenerations: 8,
  },
  {
    credits: 80,
    price: 6.99,
    priceDisplay: '$6.99',
    perCredit: 0.087,
    deckGenerations: 16,
  },
]

// Helper functions

/**
 * Check if a tier has access to a feature
 */
export function hasFeatureAccess(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return FEATURE_ACCESS[feature]?.includes(tier) ?? false
}

/**
 * Get the minimum tier required for a feature
 */
export function getMinimumTier(feature: FeatureKey): SubscriptionTier {
  const tiers = FEATURE_ACCESS[feature]
  if (!tiers || tiers.length === 0) return 'premium'

  // Return the lowest tier that has access
  if (tiers.includes('free')) return 'free'
  if (tiers.includes('pro')) return 'pro'
  return 'premium'
}

/**
 * Check if user has enough credits for an action
 */
export function hasEnoughCredits(currentCredits: number, action: keyof typeof CREDIT_COSTS): boolean {
  const cost = CREDIT_COSTS[action]
  return currentCredits >= cost
}

/**
 * Get the credit cost for an action
 */
export function getCreditCost(action: keyof typeof CREDIT_COSTS): number {
  return CREDIT_COSTS[action] || 0
}

/**
 * Check if user can save more decks
 */
export function canSaveMoreDecks(tier: SubscriptionTier, currentDeckCount: number): boolean {
  const maxDecks = MAX_DECKS[tier]
  return currentDeckCount < maxDecks
}

/**
 * Compare two tiers - returns positive if tier1 > tier2
 */
export function compareTiers(tier1: SubscriptionTier, tier2: SubscriptionTier): number {
  return TIER_LEVEL[tier1] - TIER_LEVEL[tier2]
}

/**
 * Check if tier1 is at least tier2
 */
export function isAtLeastTier(currentTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_LEVEL[currentTier] >= TIER_LEVEL[requiredTier]
}
