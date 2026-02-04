import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Dashboard.css'

// Mock data - will be replaced with real data from Firebase later
const MOCK_RECENT_DECKS = [
  { id: '1', name: 'Mono Red Aggro', format: 'Standard', cards: 60, updatedAt: 'Today' },
  { id: '2', name: 'Azorius Control', format: 'Pioneer', cards: 75, updatedAt: 'Yesterday' },
  { id: '3', name: 'Elves Tribal', format: 'Commander', cards: 100, updatedAt: '3 days ago' },
]

const QUICK_ACTIONS = [
  {
    title: 'Build New Deck',
    subtitle: 'Start from scratch',
    icon: '🎴',
    action: '/deck-builder',
    color: '#667eea',
  },
  {
    title: 'Scan Cards',
    subtitle: 'Use your camera',
    icon: '📷',
    action: '/deck-builder?scan=true',
    color: '#10b981',
  },
  {
    title: 'My Decks',
    subtitle: 'View collection',
    icon: '📚',
    action: '/my-decks',
    color: '#f59e0b',
  },
  {
    title: 'Explore',
    subtitle: 'Public decks',
    icon: '🌍',
    action: '/public-decks',
    color: '#8b5cf6',
  },
]

const TIPS = [
  { icon: '🎯', tip: 'A solid mana curve peaks at 2-3 CMC. Too many high-cost spells leads to slow starts.', category: 'Deckbuilding' },
  { icon: '🔄', tip: 'Sideboard cards should address your worst matchups. Identify your deck\'s weaknesses first.', category: 'Sideboard' },
  { icon: '✋', tip: 'In most formats, you want to mulligan hands with 0-1 or 6-7 lands. Aim for 2-4 lands.', category: 'Gameplay' },
  { icon: '🛡️', tip: 'Interaction is key. Run at least 6-8 removal spells in most competitive decks.', category: 'Deckbuilding' },
  { icon: '♟️', tip: 'Know your role: are you the beatdown or the control? Misassigning your role loses games.', category: 'Strategy' },
]

export default function Dashboard() {
  const { user } = useAuth()

  // Get a tip based on the day
  const tipOfTheDay = TIPS[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % TIPS.length]

  // Mock stats
  const stats = {
    totalDecks: 12,
    cardsScanned: 156,
    analysesRun: 24,
    creditsRemaining: user?.credits ?? 0,
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Header */}
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>{getGreeting()}, {user?.displayName || 'Player'}!</h1>
          <p className="welcome-subtitle">Ready to build your next winning deck?</p>
        </div>
        <div className="credits-display">
          <span className="credits-icon">⚡</span>
          <div className="credits-info">
            <span className="credits-count">{stats.creditsRemaining}</span>
            <span className="credits-label">Credits</span>
          </div>
          <Link to="/account#subscription" className="upgrade-link">
            Upgrade
          </Link>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Quick Actions */}
        <section className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            {QUICK_ACTIONS.map((action, index) => (
              <Link
                key={index}
                to={action.action}
                className="quick-action-card"
                style={{ '--accent-color': action.color } as React.CSSProperties}
              >
                <span className="action-icon">{action.icon}</span>
                <div className="action-text">
                  <span className="action-title">{action.title}</span>
                  <span className="action-subtitle">{action.subtitle}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Recent Decks */}
          <section className="dashboard-card recent-decks-card">
            <div className="card-header">
              <h3>Recent Decks</h3>
              <Link to="/my-decks" className="view-all-link">View All</Link>
            </div>
            {MOCK_RECENT_DECKS.length > 0 ? (
              <div className="decks-list">
                {MOCK_RECENT_DECKS.map(deck => (
                  <Link key={deck.id} to={`/deck/${deck.id}`} className="deck-item">
                    <div className="deck-info">
                      <span className="deck-name">{deck.name}</span>
                      <span className="deck-meta">
                        {deck.format} • {deck.cards} cards
                      </span>
                    </div>
                    <span className="deck-date">{deck.updatedAt}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">🎴</span>
                <p>No decks yet</p>
                <Link to="/deck-builder" className="btn btn-primary btn-sm">
                  Create Your First Deck
                </Link>
              </div>
            )}
          </section>

          {/* Stats Card */}
          <section className="dashboard-card stats-card">
            <h3>Your Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.totalDecks}</span>
                <span className="stat-label">Decks Built</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.cardsScanned}</span>
                <span className="stat-label">Cards Scanned</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.analysesRun}</span>
                <span className="stat-label">AI Analyses</span>
              </div>
            </div>
          </section>

          {/* Tip of the Day */}
          <section className="dashboard-card tip-card">
            <div className="card-header">
              <h3>Tip of the Day</h3>
              <span className="tip-category">{tipOfTheDay.category}</span>
            </div>
            <div className="tip-content">
              <span className="tip-icon">{tipOfTheDay.icon}</span>
              <p>{tipOfTheDay.tip}</p>
            </div>
          </section>

          {/* Subscription Card */}
          <section className="dashboard-card subscription-card">
            <div className="subscription-header">
              <div className="sub-badge free">Free Plan</div>
              <Link to="/account#subscription" className="upgrade-btn">
                Upgrade
              </Link>
            </div>
            <div className="subscription-features">
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>{stats.creditsRemaining}/10 credits remaining</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📷</span>
                <span>5 card scans per day</span>
              </div>
            </div>
            <p className="upgrade-prompt">
              Upgrade to Pro for unlimited scans and 100 monthly credits
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
