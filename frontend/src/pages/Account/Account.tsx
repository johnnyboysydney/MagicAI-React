import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Account.css'

type SubscriptionTier = 'free' | 'pro' | 'unlimited'

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

const SUBSCRIPTION_PLANS: Record<SubscriptionTier, {
  name: string
  price: string
  credits: string
  features: string[]
  popular?: boolean
}> = {
  free: {
    name: 'Free',
    price: '$0',
    credits: '10 credits/month',
    features: [
      '10 AI analysis credits per month',
      'Basic deck statistics',
      'Card scanning (5/day)',
      'Standard deck builder',
    ],
  },
  pro: {
    name: 'Pro',
    price: '$9.99/mo',
    credits: '100 credits/month',
    features: [
      '100 AI analysis credits per month',
      'Advanced deck analytics',
      'Unlimited card scanning',
      'Priority support',
      'Meta comparison tools',
    ],
    popular: true,
  },
  unlimited: {
    name: 'Unlimited',
    price: '$19.99/mo',
    credits: 'Unlimited',
    features: [
      'Unlimited AI analysis',
      'All Pro features',
      'API access',
      'Early access to new features',
      'Custom AI models',
      'Dedicated support',
    ],
  },
}

export default function Account() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState<'settings' | 'subscription' | 'billing'>('settings')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Check for hash navigation
  useEffect(() => {
    if (location.hash === '#subscription') {
      setActiveSection('subscription')
    } else if (location.hash === '#billing') {
      setActiveSection('billing')
    }
  }, [location.hash])

  // Placeholder data - will be connected to Firebase later
  const [subscription] = useState<Subscription>({
    tier: 'free',
    creditsRemaining: 7,
    creditsTotal: 10,
    renewalDate: 'February 15, 2025',
    features: SUBSCRIPTION_PLANS.free.features,
  })

  const [settings, setSettings] = useState<AccountSettings>({
    email: 'player@example.com',
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
    alert(`Upgrade to ${SUBSCRIPTION_PLANS[tier].name} - Coming soon!`)
  }

  const creditsPercentage = (subscription.creditsRemaining / subscription.creditsTotal) * 100

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
                      <span className="separator">/</span>
                      <span className="total">{subscription.creditsTotal}</span>
                    </div>
                    <div className="credits-bar">
                      <div
                        className="credits-fill"
                        style={{ width: `${creditsPercentage}%` }}
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
                </div>
              </div>

              {/* Upgrade Plans */}
              <div className="plans-grid">
                {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionTier, typeof SUBSCRIPTION_PLANS.free][]).map(
                  ([tier, plan]) => (
                    <div
                      key={tier}
                      className={`plan-card ${tier === subscription.tier ? 'current' : ''} ${plan.popular ? 'popular' : ''}`}
                    >
                      {plan.popular && <span className="popular-badge">Most Popular</span>}
                      <h3>{plan.name}</h3>
                      <div className="plan-price">{plan.price}</div>
                      <div className="plan-credits">{plan.credits}</div>
                      <ul className="plan-features">
                        {plan.features.map((feature, i) => (
                          <li key={i}>
                            <span className="check">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
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
