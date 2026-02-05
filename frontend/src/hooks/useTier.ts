/**
 * useTier Hook
 * Provides tier-based feature access control and credit management
 */

import { useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  type SubscriptionTier,
  type FeatureKey,
  CREDIT_COSTS,
  MAX_DECKS,
  TIER_DEFINITIONS,
  hasFeatureAccess,
  getMinimumTier,
  hasEnoughCredits,
  getCreditCost,
  canSaveMoreDecks,
} from '../config/tiers'

export interface UseTierReturn {
  // Current user's tier info
  tier: SubscriptionTier
  tierName: string
  credits: number
  maxDecks: number

  // Feature access checks
  canUse: (feature: FeatureKey) => boolean
  canAfford: (action: keyof typeof CREDIT_COSTS) => boolean
  canSaveDeck: (currentDeckCount: number) => boolean

  // Detailed checks with reasons
  checkFeature: (feature: FeatureKey) => FeatureCheckResult
  checkCredits: (action: keyof typeof CREDIT_COSTS) => CreditCheckResult

  // Upgrade helpers
  getUpgradeReason: (feature: FeatureKey) => string | null
  getMinimumTierFor: (feature: FeatureKey) => SubscriptionTier
  shouldShowUpgrade: boolean

  // Credit info
  getCost: (action: keyof typeof CREDIT_COSTS) => number
  creditCosts: typeof CREDIT_COSTS
}

export interface FeatureCheckResult {
  allowed: boolean
  reason?: 'tier_required' | 'credits_required' | 'deck_limit'
  requiredTier?: SubscriptionTier
  creditsNeeded?: number
  currentCredits?: number
}

export interface CreditCheckResult {
  canAfford: boolean
  cost: number
  currentCredits: number
  deficit: number
}

export function useTier(): UseTierReturn {
  const { user } = useAuth()

  // Get current tier, defaulting to 'free' if not set
  // Maps 'unlimited' (legacy) to 'premium'
  const tier: SubscriptionTier = useMemo(() => {
    const userTier = user?.subscription
    if (!userTier) return 'free'
    if (userTier === 'pro' || userTier === 'free') {
      return userTier
    }
    // Handle 'unlimited' tier -> map to 'premium'
    if (userTier === 'unlimited') {
      return 'premium'
    }
    return 'free'
  }, [user?.subscription])

  const credits = user?.credits ?? 0
  const tierDef = TIER_DEFINITIONS[tier]

  // Check if user can use a feature
  const canUse = useCallback(
    (feature: FeatureKey): boolean => {
      return hasFeatureAccess(tier, feature)
    },
    [tier]
  )

  // Check if user can afford an action
  const canAfford = useCallback(
    (action: keyof typeof CREDIT_COSTS): boolean => {
      return hasEnoughCredits(credits, action)
    },
    [credits]
  )

  // Check if user can save more decks
  const canSaveDeck = useCallback(
    (currentDeckCount: number): boolean => {
      return canSaveMoreDecks(tier, currentDeckCount)
    },
    [tier]
  )

  // Detailed feature check
  const checkFeature = useCallback(
    (feature: FeatureKey): FeatureCheckResult => {
      if (!hasFeatureAccess(tier, feature)) {
        return {
          allowed: false,
          reason: 'tier_required',
          requiredTier: getMinimumTier(feature),
        }
      }

      // For features that cost credits, check if user can afford
      if (feature in CREDIT_COSTS) {
        const cost = CREDIT_COSTS[feature as keyof typeof CREDIT_COSTS]
        if (credits < cost) {
          return {
            allowed: false,
            reason: 'credits_required',
            creditsNeeded: cost,
            currentCredits: credits,
          }
        }
      }

      return { allowed: true }
    },
    [tier, credits]
  )

  // Detailed credit check
  const checkCredits = useCallback(
    (action: keyof typeof CREDIT_COSTS): CreditCheckResult => {
      const cost = getCreditCost(action)
      return {
        canAfford: credits >= cost,
        cost,
        currentCredits: credits,
        deficit: Math.max(0, cost - credits),
      }
    },
    [credits]
  )

  // Get reason for upgrade prompt
  const getUpgradeReason = useCallback(
    (feature: FeatureKey): string | null => {
      if (hasFeatureAccess(tier, feature)) {
        return null
      }

      const requiredTier = getMinimumTier(feature)
      const requiredTierDef = TIER_DEFINITIONS[requiredTier]

      return `Upgrade to ${requiredTierDef.name} to unlock this feature`
    },
    [tier]
  )

  // Should show upgrade prompts (user is on free tier)
  const shouldShowUpgrade = tier === 'free'

  return {
    tier,
    tierName: tierDef.name,
    credits,
    maxDecks: MAX_DECKS[tier],

    canUse,
    canAfford,
    canSaveDeck,

    checkFeature,
    checkCredits,

    getUpgradeReason,
    getMinimumTierFor: getMinimumTier,
    shouldShowUpgrade,

    getCost: getCreditCost,
    creditCosts: CREDIT_COSTS,
  }
}

// Re-export types for convenience
export type { SubscriptionTier, FeatureKey }
