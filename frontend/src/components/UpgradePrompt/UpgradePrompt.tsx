/**
 * UpgradePrompt Component
 * Shows upgrade prompts when users try to access locked features
 */

import { Link } from 'react-router-dom'
import { type FeatureKey, TIER_DEFINITIONS, getMinimumTier } from '../../config/tiers'
import './UpgradePrompt.css'

interface UpgradePromptProps {
  feature: FeatureKey
  variant?: 'modal' | 'inline' | 'banner'
  onClose?: () => void
  customMessage?: string
}

// Human-readable feature names
const FEATURE_NAMES: Record<FeatureKey, string> = {
  simpleAnalysis: 'Simple Card Analysis',
  fullAnalysis: 'Full AI Analysis',
  deckGeneration: 'AI Deck Generation',
  cameraScanner: 'Camera Scanner',
  exportMTGA: 'Export to MTGA',
  exportMoxfield: 'Export to Moxfield',
  publicSharing: 'Public Deck Sharing',
  unlimitedDecks: 'Unlimited Decks',
  prioritySupport: 'Priority Support',
  earlyAccess: 'Early Access to Features',
  creditRollover: 'Credit Rollover',
  deckVersioning: 'Deck Version History',
  advancedSearch: 'Advanced Card Search',
}

export function UpgradePrompt({
  feature,
  variant = 'inline',
  onClose,
  customMessage,
}: UpgradePromptProps) {
  const requiredTier = getMinimumTier(feature)
  const tierDef = TIER_DEFINITIONS[requiredTier]
  const featureName = FEATURE_NAMES[feature] || feature

  const message = customMessage || `Upgrade to ${tierDef.name} to unlock ${featureName}`

  if (variant === 'modal') {
    return (
      <div className="upgrade-prompt-overlay" onClick={onClose}>
        <div className="upgrade-prompt-modal" onClick={(e) => e.stopPropagation()}>
          <button className="upgrade-close" onClick={onClose}>
            &times;
          </button>
          <div className="upgrade-icon">🔒</div>
          <h3>Feature Locked</h3>
          <p>{message}</p>
          <div className="upgrade-tier-preview">
            <div className="tier-name">{tierDef.name}</div>
            <div className="tier-price">{tierDef.priceDisplay}</div>
            <div className="tier-credits">{tierDef.creditsLabel}</div>
          </div>
          <div className="upgrade-benefits">
            <h4>You'll get:</h4>
            <ul>
              {tierDef.features.slice(0, 4).map((f, i) => (
                <li key={i}>✓ {f}</li>
              ))}
            </ul>
          </div>
          <div className="upgrade-actions">
            <Link to="/account#subscription" className="btn btn-primary">
              Upgrade Now
            </Link>
            <button className="btn btn-secondary" onClick={onClose}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className="upgrade-prompt-banner">
        <span className="banner-icon">🔒</span>
        <span className="banner-message">{message}</span>
        <Link to="/account#subscription" className="btn btn-small btn-primary">
          Upgrade
        </Link>
        {onClose && (
          <button className="banner-close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
    )
  }

  // Inline variant (default)
  return (
    <div className="upgrade-prompt-inline">
      <div className="inline-content">
        <span className="inline-icon">🔒</span>
        <div className="inline-text">
          <strong>{featureName}</strong>
          <span>{message}</span>
        </div>
      </div>
      <Link to="/account#subscription" className="btn btn-primary btn-small">
        Upgrade to {tierDef.name}
      </Link>
    </div>
  )
}

// Credit-specific prompt when user is out of credits
interface CreditPromptProps {
  needed: number
  current: number
  variant?: 'modal' | 'inline' | 'banner'
  onClose?: () => void
}

export function CreditPrompt({
  needed,
  current,
  variant = 'inline',
  onClose,
}: CreditPromptProps) {
  const deficit = needed - current

  if (variant === 'modal') {
    return (
      <div className="upgrade-prompt-overlay" onClick={onClose}>
        <div className="upgrade-prompt-modal" onClick={(e) => e.stopPropagation()}>
          <button className="upgrade-close" onClick={onClose}>
            &times;
          </button>
          <div className="upgrade-icon">⚡</div>
          <h3>Not Enough Credits</h3>
          <p>
            You need <strong>{needed}</strong> credits but only have{' '}
            <strong>{current}</strong>.
          </p>
          <div className="credit-deficit">
            <span className="deficit-label">Credits needed:</span>
            <span className="deficit-value">{deficit}</span>
          </div>
          <div className="upgrade-actions">
            <Link to="/account#subscription" className="btn btn-primary">
              Get More Credits
            </Link>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className="upgrade-prompt-banner credits">
        <span className="banner-icon">⚡</span>
        <span className="banner-message">
          Need {deficit} more credit{deficit !== 1 ? 's' : ''} ({current}/{needed})
        </span>
        <Link to="/account#subscription" className="btn btn-small btn-primary">
          Get Credits
        </Link>
        {onClose && (
          <button className="banner-close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
    )
  }

  // Inline variant
  return (
    <div className="upgrade-prompt-inline credits">
      <div className="inline-content">
        <span className="inline-icon">⚡</span>
        <div className="inline-text">
          <strong>Not Enough Credits</strong>
          <span>
            Need {needed} credits, you have {current}
          </span>
        </div>
      </div>
      <Link to="/account#subscription" className="btn btn-primary btn-small">
        Get Credits
      </Link>
    </div>
  )
}

// Deck limit prompt
interface DeckLimitPromptProps {
  maxDecks: number
  variant?: 'modal' | 'inline' | 'banner'
  onClose?: () => void
}

export function DeckLimitPrompt({
  maxDecks,
  variant = 'inline',
  onClose,
}: DeckLimitPromptProps) {
  if (variant === 'banner') {
    return (
      <div className="upgrade-prompt-banner">
        <span className="banner-icon">📁</span>
        <span className="banner-message">
          Deck limit reached ({maxDecks} decks). Upgrade for more!
        </span>
        <Link to="/account#subscription" className="btn btn-small btn-primary">
          Upgrade
        </Link>
        {onClose && (
          <button className="banner-close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="upgrade-prompt-inline">
      <div className="inline-content">
        <span className="inline-icon">📁</span>
        <div className="inline-text">
          <strong>Deck Limit Reached</strong>
          <span>You can save up to {maxDecks} decks on your current plan</span>
        </div>
      </div>
      <Link to="/account#subscription" className="btn btn-primary btn-small">
        Upgrade for More
      </Link>
    </div>
  )
}

export default UpgradePrompt
