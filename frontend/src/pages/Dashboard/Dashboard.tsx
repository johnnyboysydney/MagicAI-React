import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDeck } from '../../contexts/DeckContext'
import type { Deck } from '../../contexts/DeckContext'
import { getPublicDecks, getTrendingDecks, firestoreDeckToAppDeck } from '../../services/deckService'
import './Dashboard.css'

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
    title: 'My Collection',
    subtitle: 'Track your cards',
    icon: '📦',
    action: '/collection',
    color: '#06b6d4',
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
  const { userDecks } = useDeck()

  const [trendingDecks, setTrendingDecks] = useState<Deck[]>([])
  const [recentPublic, setRecentPublic] = useState<Deck[]>([])

  // Get a tip based on the day
  const tipOfTheDay = TIPS[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % TIPS.length]

  // Load community data
  useEffect(() => {
    const loadCommunityData = async () => {
      try {
        const [trending, recent] = await Promise.all([
          getTrendingDecks(5),
          getPublicDecks(5),
        ])
        setTrendingDecks(trending.map(firestoreDeckToAppDeck))
        setRecentPublic(recent.map(firestoreDeckToAppDeck))
      } catch (err) {
        console.error('Failed to load community data:', err)
      }
    }
    loadCommunityData()
  }, [])

  // Real stats from user data
  const stats = {
    totalDecks: userDecks.length,
    publicDecks: userDecks.filter((d) => d.isPublic).length,
    creditsRemaining: user?.credits ?? 0,
  }

  // Recent user decks (sorted by updatedAt, take 5)
  const recentUserDecks = [...userDecks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getFormatColor = (format: string): string => {
    const colors: Record<string, string> = {
      standard: '#22c55e',
      modern: '#3b82f6',
      commander: '#8b5cf6',
      pioneer: '#f59e0b',
      legacy: '#ef4444',
      vintage: '#ec4899',
      pauper: '#6b7280',
    }
    return colors[format] || '#6b7280'
  }

  const getDeckCardCount = (deck: Deck): number => {
    let count = 0
    deck.cards.forEach((card) => { count += card.quantity })
    if (deck.commander) count += 1
    return count
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
            {recentUserDecks.length > 0 ? (
              <div className="decks-list">
                {recentUserDecks.map((deck) => (
                  <Link key={deck.id} to={`/deck/${deck.id}`} className="deck-item">
                    <div className="deck-info">
                      <span className="deck-name">{deck.name}</span>
                      <span className="deck-meta">
                        {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)} • {getDeckCardCount(deck)} cards
                      </span>
                    </div>
                    <span className="deck-date">{formatDate(deck.updatedAt)}</span>
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
                <span className="stat-value">{stats.publicDecks}</span>
                <span className="stat-label">Public</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.creditsRemaining}</span>
                <span className="stat-label">Credits</span>
              </div>
            </div>
          </section>

          {/* Trending Decks */}
          {trendingDecks.length > 0 && (
            <section className="dashboard-card community-card">
              <div className="card-header">
                <h3>Trending Decks</h3>
                <Link to="/public-decks" className="view-all-link">Explore</Link>
              </div>
              <div className="decks-list">
                {trendingDecks.map((deck) => (
                  <Link key={deck.id} to={`/deck/${deck.id}`} className="deck-item">
                    <div className="deck-info">
                      <span className="deck-name">{deck.name}</span>
                      <span className="deck-meta">
                        <span
                          className="mini-format-badge"
                          style={{ color: getFormatColor(deck.format) }}
                        >
                          {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
                        </span>
                        {' • '}by {deck.authorName}
                      </span>
                    </div>
                    <span className="deck-likes">{deck.likeCount || 0} likes</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recently Published */}
          {recentPublic.length > 0 && (
            <section className="dashboard-card community-card">
              <div className="card-header">
                <h3>Recently Published</h3>
                <Link to="/public-decks" className="view-all-link">View All</Link>
              </div>
              <div className="decks-list">
                {recentPublic.map((deck) => (
                  <Link key={deck.id} to={`/deck/${deck.id}`} className="deck-item">
                    <div className="deck-info">
                      <span className="deck-name">{deck.name}</span>
                      <span className="deck-meta">
                        <span
                          className="mini-format-badge"
                          style={{ color: getFormatColor(deck.format) }}
                        >
                          {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
                        </span>
                        {' • '}by {deck.authorName}
                      </span>
                    </div>
                    <span className="deck-date">{formatDate(deck.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

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
