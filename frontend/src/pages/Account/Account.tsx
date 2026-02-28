import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ProfileCustomization } from '../../components/ProfileCustomization'
import {
  type UserProfileCustomization,
  DEFAULT_CUSTOMIZATION,
  getTierCustomizationSummary,
} from '../../config/profileCustomization'
import './Account.css'

type SubscriptionTier = 'free' | 'pro' | 'premium'

interface Subscription {
  tier: SubscriptionTier
  creditsRemaining: number
  creditsTotal: number
  renewalDate: string | null
  features: string[]
}

interface AccountSettings {
  email: string
  emailNotifications: boolean
  marketingEmails: boolean
  twoFactorEnabled: boolean
}

// Credit costs per feature
const CREDIT_COSTS = {
  simpleAnalysis: 1,
  fullAnalysis: 2,
  deckGeneration: 5,
}

// Subscription plans with accurate pricing
const SUBSCRIPTION_PLANS: Record<SubscriptionTier, {
  name: string
  price: string
  priceValue: number
  credits: number
  creditsLabel: string
  perCredit: string
  features: string[]
  lockedFeatures?: string[]
  popular?: boolean
}> = {
  free: {
    name: 'Free',
    price: '$0',
    priceValue: 0,
    credits: 10,
    creditsLabel: '10 credits (one-time)',
    perCredit: '-',
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
    name: 'Pro',
    price: '$7.99/mo',
    priceValue: 7.99,
    credits: 120,
    creditsLabel: '120 credits/month',
    perCredit: '$0.067',
    features: [
      '120 AI credits/month',
      'Full AI analysis',
      'AI deck generation',
      'Up to 20 saved decks',
      'Export to MTGA/Moxfield',
      'Public deck sharing',
      'Camera scanner',
    ],
    popular: true,
  },
  premium: {
    name: 'Premium',
    price: '$14.99/mo',
    priceValue: 14.99,
    credits: 300,
    creditsLabel: '300 credits/month',
    perCredit: '$0.05',
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

// Top-up packages (intentionally more expensive than subscription)
const TOPUP_PACKAGES = [
  { credits: 15, price: '$1.99', priceValue: 1.99, perCredit: '$0.13', deckGens: 3 },
  { credits: 40, price: '$3.99', priceValue: 3.99, perCredit: '$0.10', deckGens: 8 },
  { credits: 80, price: '$6.99', priceValue: 6.99, perCredit: '$0.087', deckGens: 16 },
]

export default function Account() {
  const location = useLocation()
  const { user, updateProfileCustomization } = useAuth()
  const [activeSection, setActiveSection] = useState<'settings' | 'customize' | 'subscription' | 'billing'>('settings')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Check for hash navigation
  useEffect(() => {
    if (location.hash === '#subscription') {
      setActiveSection('subscription')
    } else if (location.hash === '#billing') {
      setActiveSection('billing')
    } else if (location.hash === '#customize') {
      setActiveSection('customize')
    }
  }, [location.hash])

  // Profile customization - get from user or use defaults
  const profileCustomization = user?.profileCustomization || DEFAULT_CUSTOMIZATION

  // Handle saving profile customization
  const handleSaveCustomization = useCallback(async (customization: UserProfileCustomization) => {
    try {
      await updateProfileCustomization(customization)
    } catch (error) {
      console.error('Failed to save customization:', error)
      throw error
    }
  }, [updateProfileCustomization])

  // Get subscription data from auth context
  // Map 'unlimited' (legacy) to 'premium'
  const rawTier = user?.subscription || 'free'
  const currentTier: SubscriptionTier = rawTier === 'unlimited' ? 'premium' : (rawTier as SubscriptionTier)
  const currentPlan = SUBSCRIPTION_PLANS[currentTier] || SUBSCRIPTION_PLANS.free

  const [subscription] = useState<Subscription>({
    tier: currentTier,
    creditsRemaining: user?.credits || 0,
    creditsTotal: currentPlan.credits,
    renewalDate: currentTier !== 'free' ? 'Next month' : null,
    features: currentPlan.features,
  })

  const [settings, setSettings] = useState<AccountSettings>({
    email: user?.email || 'player@example.com',
    emailNotifications: true,
    marketingEmails: false,
    twoFactorEnabled: false,
  })

  const handleSettingChange = (key: keyof AccountSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    // TODO: Save to Firebase
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const handleUpgrade = (tier: SubscriptionTier) => {
    // TODO: Implement Stripe checkout
    console.log('Upgrading to:', tier)
    alert(`Upgrade to ${SUBSCRIPTION_PLANS[tier].name} - Coming soon! Stripe integration pending.`)
  }

  const handleBuyTopup = (credits: number, price: string) => {
    // TODO: Implement Stripe checkout for top-ups
    console.log('Buying top-up:', credits, 'credits for', price)
    alert(`Buy ${credits} credits for ${price} - Coming soon! Stripe integration pending.`)
  }

  const creditsPercentage = currentTier === 'free'
    ? (subscription.creditsRemaining / 10) * 100
    : (subscription.creditsRemaining / subscription.creditsTotal) * 100

  return (
    <div className="account-page">
      {/* Header */}
      <div className="account-header">
        <div className="header-left">
          <Link to="/profile" className="back-link">
            ← Back to Profile
          </Link>
          <h1>Account Settings</h1>
        </div>
      </div>

      <div className="account-content">
        {/* Sidebar Navigation */}
        <nav className="account-nav">
          <button
            className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'customize' ? 'active' : ''}`}
            onClick={() => setActiveSection('customize')}
          >
            <span className="nav-icon">🎨</span>
            <span>Customize</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveSection('subscription')}
          >
            <span className="nav-icon">💎</span>
            <span>Subscription</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveSection('billing')}
          >
            <span className="nav-icon">💳</span>
            <span>Billing</span>
          </button>
        </nav>

        {/* Main Content */}
        <div className="account-main">
          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="settings-section">
              <div className="section-card">
                <h2>Account Information</h2>
                <div className="info-row">
                  <label>Email Address</label>
                  <div className="info-value">
                    <span>{settings.email}</span>
                    <button className="btn btn-text">Change</button>
                  </div>
                </div>
                <div className="info-row">
                  <label>Password</label>
                  <div className="info-value">
                    <span>••••••••••</span>
                    <button className="btn btn-text">Change</button>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h2>Security</h2>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Two-Factor Authentication</span>
                    <span className="toggle-description">
                      Add an extra layer of security to your account
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorEnabled}
                      onChange={e => handleSettingChange('twoFactorEnabled', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="section-card">
                <h2>Notifications</h2>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Email Notifications</span>
                    <span className="toggle-description">
                      Receive updates about your decks and analyses
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={e => handleSettingChange('emailNotifications', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Marketing Emails</span>
                    <span className="toggle-description">
                      Receive news about features and promotions
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.marketingEmails}
                      onChange={e => handleSettingChange('marketingEmails', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="section-card danger-zone">
                <h2>Danger Zone</h2>
                <div className="danger-row">
                  <div className="danger-info">
                    <span className="danger-label">Delete Account</span>
                    <span className="danger-description">
                      Permanently delete your account and all associated data
                    </span>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Account
                  </button>
                </div>
              </div>

              <div className="save-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'customize' && (
            <div className="profile-section">
              <div className="section-card">
                <div className="profile-header">
                  <h2>Profile Customization</h2>
                  <div className="tier-benefits">
                    {(() => {
                      const summary = getTierCustomizationSummary(currentTier)
                      return (
                        <span className="tier-summary">
                          Your {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} plan includes{' '}
                          <strong>{summary.freeAvatars} avatars</strong>,{' '}
                          <strong>{summary.freeBackgrounds} backgrounds</strong>, and{' '}
                          <strong>{summary.freeThemes} themes</strong> for free
                          {summary.canUploadAvatar && ' + custom avatar upload'}
                        </span>
                      )
                    })()}
                  </div>
                </div>
                <ProfileCustomization
                  currentCustomization={profileCustomization}
                  onSave={handleSaveCustomization}
                />
              </div>
            </div>
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <div className="subscription-section">
              {/* Current Plan */}
              <div className="section-card current-plan">
                <div className="plan-header">
                  <div>
                    <h2>Current Plan</h2>
                    <div className="plan-badge">
                      <span className={`badge badge-${subscription.tier}`}>
                        {SUBSCRIPTION_PLANS[subscription.tier].name}
                      </span>
                    </div>
                  </div>
                  <div className="credits-display">
                    <div className="credits-header">
                      <span className="credits-icon">⚡</span>
                      <span className="credits-label">Credits</span>
                    </div>
                    <div className="credits-count">
                      <span className="current">{subscription.creditsRemaining}</span>
                      {subscription.tier !== 'free' && (
                        <>
                          <span className="separator">/</span>
                          <span className="total">{subscription.creditsTotal}</span>
                        </>
                      )}
                    </div>
                    <div className="credits-bar">
                      <div
                        className="credits-fill"
                        style={{ width: `${Math.min(creditsPercentage, 100)}%` }}
                      />
                    </div>
                    {subscription.renewalDate && (
                      <span className="renewal-date">
                        Renews {subscription.renewalDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="current-features">
                  <h4>Your Features:</h4>
                  <ul>
                    {subscription.features.map((feature, i) => (
                      <li key={i}>
                        <span className="check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {currentPlan.lockedFeatures && currentPlan.lockedFeatures.length > 0 && (
                    <>
                      <h4 className="locked-title">Upgrade to unlock:</h4>
                      <ul className="locked-features">
                        {currentPlan.lockedFeatures.map((feature, i) => (
                          <li key={i}>
                            <span className="lock">🔒</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Credit Costs Info */}
              <div className="section-card credit-costs-card">
                <h2>Credit Costs</h2>
                <p className="credit-costs-desc">Each AI feature uses credits from your balance:</p>
                <div className="credit-costs-grid">
                  <div className="credit-cost-item">
                    <span className="cost-icon">🔍</span>
                    <span className="cost-name">Simple Analysis</span>
                    <span className="cost-value">{CREDIT_COSTS.simpleAnalysis} credit</span>
                  </div>
                  <div className="credit-cost-item">
                    <span className="cost-icon">📊</span>
                    <span className="cost-name">Full Analysis</span>
                    <span className="cost-value">{CREDIT_COSTS.fullAnalysis} credits</span>
                  </div>
                  <div className="credit-cost-item">
                    <span className="cost-icon">🎴</span>
                    <span className="cost-name">Deck Generation</span>
                    <span className="cost-value">{CREDIT_COSTS.deckGeneration} credits</span>
                  </div>
                </div>
              </div>

              {/* Value Comparison Banner */}
              <div className="section-card value-comparison">
                <div className="value-badge">💡 Best Value</div>
                <h3>Why Subscribe?</h3>
                <div className="comparison-grid">
                  <div className="comparison-item">
                    <span className="comparison-label">Pro Subscription</span>
                    <span className="comparison-value highlight">$0.067/credit</span>
                    <span className="comparison-detail">120 credits for $7.99/mo</span>
                  </div>
                  <div className="comparison-vs">vs</div>
                  <div className="comparison-item">
                    <span className="comparison-label">Top-up Purchase</span>
                    <span className="comparison-value">$0.10/credit</span>
                    <span className="comparison-detail">40 credits for $3.99</span>
                  </div>
                </div>
                <p className="comparison-savings">
                  <strong>Subscribers save up to 50%</strong> compared to one-time purchases!
                </p>
              </div>

              {/* Subscription Plans */}
              <h2 className="section-title">Choose Your Plan</h2>
              <div className="plans-grid">
                {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionTier, typeof SUBSCRIPTION_PLANS.free][]).map(
                  ([tier, plan]) => (
                    <div
                      key={tier}
                      className={`plan-card ${tier === subscription.tier ? 'current' : ''} ${plan.popular ? 'popular' : ''}`}
                    >
                      {plan.popular && <span className="popular-badge">Best Value</span>}
                      <h3>{plan.name}</h3>
                      <div className="plan-price">{plan.price}</div>
                      <div className="plan-credits">{plan.creditsLabel}</div>
                      {tier !== 'free' && (
                        <div className="plan-per-credit">{plan.perCredit} per credit</div>
                      )}
                      <ul className="plan-features">
                        {plan.features.map((feature, i) => (
                          <li key={i}>
                            <span className="check">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {tier !== 'free' && (
                        <div className="plan-usage">
                          <span>≈ {Math.floor(plan.credits / CREDIT_COSTS.deckGeneration)} deck generations</span>
                          <span>≈ {Math.floor(plan.credits / CREDIT_COSTS.fullAnalysis)} full analyses</span>
                        </div>
                      )}
                      {tier === subscription.tier ? (
                        <button className="btn btn-current" disabled>
                          Current Plan
                        </button>
                      ) : (
                        <button
                          className={`btn ${tier === 'free' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleUpgrade(tier)}
                        >
                          {tier === 'free' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Top-up Packages */}
              <div className="section-card topup-section">
                <h2>Need Extra Credits?</h2>
                <p className="topup-desc">
                  One-time purchases for when you need a quick boost.
                  <strong> Subscriptions offer better value!</strong>
                </p>
                <div className="topup-grid">
                  {TOPUP_PACKAGES.map((pkg) => (
                    <div key={pkg.credits} className="topup-card">
                      <div className="topup-credits">{pkg.credits} Credits</div>
                      <div className="topup-price">{pkg.price}</div>
                      <div className="topup-per-credit">{pkg.perCredit}/credit</div>
                      <div className="topup-usage">≈ {pkg.deckGens} deck generations</div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleBuyTopup(pkg.credits, pkg.price)}
                      >
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
                <p className="topup-note">
                  💡 Tip: A Pro subscription at $7.99/mo gives you 120 credits ({SUBSCRIPTION_PLANS.pro.perCredit}/credit) —
                  that's <strong>33% cheaper</strong> than our best top-up rate!
                </p>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <div className="billing-section">
              <div className="section-card">
                <h2>Payment Method</h2>
                <div className="payment-method">
                  <div className="no-payment">
                    <span className="payment-icon">💳</span>
                    <p>No payment method on file</p>
                    <button className="btn btn-primary">Add Payment Method</button>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <h2>Billing History</h2>
                <div className="billing-history">
                  <div className="no-history">
                    <span className="history-icon">📄</span>
                    <p>No billing history yet</p>
                    <span className="history-hint">
                      Your invoices will appear here after your first payment
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Delete Account?</h2>
            <p>
              This action cannot be undone. All your decks, analyses, and data will be
              permanently deleted.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
