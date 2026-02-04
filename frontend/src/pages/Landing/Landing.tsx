import { Link } from 'react-router-dom'
import './Landing.css'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Analysis',
    description: 'Get intelligent suggestions and strategic insights for your deck builds',
    color: '#667eea',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    description: 'Detailed mana curves, card synergies, and performance metrics',
    color: '#10b981',
  },
  {
    icon: '📷',
    title: 'Card Scanner',
    description: 'Scan physical cards with your camera and instantly add them to your deck',
    color: '#f59e0b',
  },
  {
    icon: '👥',
    title: 'Community Sharing',
    description: 'Share your decks, discover new strategies, and learn from others',
    color: '#8b5cf6',
  },
  {
    icon: '📤',
    title: 'Export Anywhere',
    description: 'Export to MTG Arena, MTGO, or any format you need',
    color: '#ef4444',
  },
  {
    icon: '🏆',
    title: 'Tournament Tools',
    description: 'Meta analysis, matchup tracking, and sideboard optimization',
    color: '#06b6d4',
  },
]

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    description: 'Get started with basic features',
    features: [
      '10 AI credits per month',
      'Basic deck statistics',
      'Card scanning (5/day)',
      'Standard deck builder',
    ],
    cta: 'Get Started',
    ctaLink: '/signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'For serious deck builders',
    features: [
      '100 AI credits per month',
      'Advanced deck analytics',
      'Unlimited card scanning',
      'Priority support',
      'Meta comparison tools',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=pro',
    popular: true,
  },
  {
    name: 'Unlimited',
    price: '$19.99',
    period: '/month',
    description: 'For tournament grinders',
    features: [
      'Unlimited AI analysis',
      'All Pro features',
      'API access',
      'Early access to features',
      'Custom AI models',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    ctaLink: '/signup?plan=unlimited',
    popular: false,
  },
]

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Build Smarter Decks with{' '}
            <span className="gradient-text">AI-Powered</span> Analysis
          </h1>
          <p className="hero-subtitle">
            MagicAI helps you analyze, optimize, and perfect your Magic: The Gathering
            decks with cutting-edge artificial intelligence.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Start Building Free
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Decks Built</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Cards Analyzed</span>
            </div>
            <div className="stat">
              <span className="stat-number">98%</span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="deck-preview-card">
            <div className="preview-header">
              <span className="preview-title">Sample Analysis</span>
              <span className="preview-badge">AI</span>
            </div>
            <div className="preview-stats">
              <div className="preview-stat">
                <span className="label">Power Level</span>
                <div className="bar">
                  <div className="fill" style={{ width: '85%' }} />
                </div>
                <span className="value">8.5/10</span>
              </div>
              <div className="preview-stat">
                <span className="label">Consistency</span>
                <div className="bar">
                  <div className="fill" style={{ width: '78%' }} />
                </div>
                <span className="value">78%</span>
              </div>
              <div className="preview-stat">
                <span className="label">Synergy</span>
                <div className="bar">
                  <div className="fill" style={{ width: '92%' }} />
                </div>
                <span className="value">92%</span>
              </div>
            </div>
            <div className="preview-insight">
              <span className="insight-icon">💡</span>
              <span>Consider adding 2x Lightning Bolt for better removal coverage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Everything You Need to Build Winning Decks</h2>
          <p>Powerful tools designed for casual players and tournament grinders alike</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon" style={{ background: `${feature.color}20` }}>
                <span>{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Get started in minutes with our intuitive workflow</p>
        </div>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Build Your Deck</h3>
              <p>Use our visual deck builder or import from MTG Arena, MTGO, or plain text</p>
            </div>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Get AI Analysis</h3>
              <p>Our AI examines your deck for synergies, weaknesses, and optimization opportunities</p>
            </div>
          </div>
          <div className="step-connector" />
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Optimize & Win</h3>
              <p>Apply suggestions, test matchups, and take your improved deck to victory</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Start free and upgrade as you grow</p>
        </div>
        <div className="pricing-grid">
          {PRICING_TIERS.map((tier, index) => (
            <div key={index} className={`pricing-card ${tier.popular ? 'popular' : ''}`}>
              {tier.popular && <span className="popular-badge">Most Popular</span>}
              <h3>{tier.name}</h3>
              <div className="price">
                <span className="amount">{tier.price}</span>
                {tier.period && <span className="period">{tier.period}</span>}
              </div>
              <p className="tier-description">{tier.description}</p>
              <ul className="tier-features">
                {tier.features.map((feature, i) => (
                  <li key={i}>
                    <span className="check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={tier.ctaLink}
                className={`btn ${tier.popular ? 'btn-primary' : 'btn-secondary'} btn-block`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Build Better Decks?</h2>
          <p>Join thousands of players using AI to improve their game</p>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
