import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDeck, type Deck } from '../../contexts/DeckContext'
import { useAuth } from '../../contexts/AuthContext'
import './MyDecks.css'

type SortOption = 'updated' | 'created' | 'name' | 'format'
type FilterFormat = 'all' | 'standard' | 'modern' | 'commander' | 'pioneer' | 'legacy' | 'vintage' | 'pauper'

export default function MyDecks() {
  const navigate = useNavigate()
  const { userDecks, deleteDeck, setDeckForAnalysis } = useDeck()
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [filterFormat, setFilterFormat] = useState<FilterFormat>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Filter and sort decks
  const filteredDecks = useMemo(() => {
    let decks = [...userDecks]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      decks = decks.filter(
        (deck) =>
          deck.name.toLowerCase().includes(query) ||
          deck.description?.toLowerCase().includes(query) ||
          deck.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by format
    if (filterFormat !== 'all') {
      decks = decks.filter((deck) => deck.format === filterFormat)
    }

    // Sort
    decks.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'format':
          return a.format.localeCompare(b.format)
        default:
          return 0
      }
    })

    return decks
  }, [userDecks, searchQuery, sortBy, filterFormat])

  const handleDeleteDeck = (deckId: string) => {
    deleteDeck(deckId)
    setShowDeleteConfirm(null)
  }

  const handleAnalyzeDeck = (deck: Deck) => {
    setDeckForAnalysis(deck.name, deck.format, deck.cards, deck.commander)
    navigate('/analysis')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
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

  // Get count of cards in deck
  const getDeckCardCount = (deck: Deck): number => {
    let count = 0
    deck.cards.forEach((card) => {
      count += card.quantity
    })
    if (deck.commander) count += 1
    return count
  }

  return (
    <div className="my-decks-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>My Decks</h1>
          <p className="header-subtitle">
            {userDecks.length} deck{userDecks.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Link to="/deck-builder" className="create-deck-btn">
          + New Deck
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Format:</label>
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value as FilterFormat)}
            >
              <option value="all">All Formats</option>
              <option value="standard">Standard</option>
              <option value="modern">Modern</option>
              <option value="commander">Commander</option>
              <option value="pioneer">Pioneer</option>
              <option value="legacy">Legacy</option>
              <option value="vintage">Vintage</option>
              <option value="pauper">Pauper</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
              <option value="updated">Last Updated</option>
              <option value="created">Date Created</option>
              <option value="name">Name</option>
              <option value="format">Format</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deck Grid */}
      {filteredDecks.length > 0 ? (
        <div className="decks-grid">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="deck-card">
              <div className="deck-card-header">
                <div className="deck-info">
                  <h3 className="deck-name">{deck.name}</h3>
                  <div className="deck-meta">
                    <span
                      className="format-badge"
                      style={{ background: `${getFormatColor(deck.format)}20`, color: getFormatColor(deck.format) }}
                    >
                      {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
                    </span>
                    <span className="card-count">{getDeckCardCount(deck)} cards</span>
                    {deck.isPublic && <span className="public-badge">Public</span>}
                  </div>
                </div>
              </div>

              {deck.description && (
                <p className="deck-description">{deck.description}</p>
              )}

              {deck.tags && deck.tags.length > 0 && (
                <div className="deck-tags">
                  {deck.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                  {deck.tags.length > 3 && (
                    <span className="tag more">+{deck.tags.length - 3}</span>
                  )}
                </div>
              )}

              {deck.commander && (
                <div className="commander-row">
                  <span className="commander-label">Commander:</span>
                  <span className="commander-name">{deck.commander.name}</span>
                </div>
              )}

              <div className="deck-footer">
                <span className="updated-at">Updated {formatDate(deck.updatedAt)}</span>
              </div>

              <div className="deck-actions">
                <Link to="/deck-builder" className="action-btn edit">
                  Edit
                </Link>
                <button className="action-btn analyze" onClick={() => handleAnalyzeDeck(deck)}>
                  Analyze
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => setShowDeleteConfirm(deck.id)}
                >
                  Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm === deck.id && (
                <div className="delete-confirm-overlay">
                  <div className="delete-confirm">
                    <p>Delete "{deck.name}"?</p>
                    <div className="confirm-actions">
                      <button
                        className="confirm-btn cancel"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="confirm-btn delete"
                        onClick={() => handleDeleteDeck(deck.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {userDecks.length === 0 ? (
            <>
              <div className="empty-icon">📚</div>
              <h2>No decks yet</h2>
              <p>Create your first deck and start building!</p>
              <Link to="/deck-builder" className="create-deck-btn">
                + Create Your First Deck
              </Link>
            </>
          ) : (
            <>
              <div className="empty-icon">🔍</div>
              <h2>No matching decks</h2>
              <p>Try adjusting your search or filters</p>
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSearchQuery('')
                  setFilterFormat('all')
                }}
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {userDecks.length > 0 && (
        <div className="deck-stats-summary">
          <div className="stat-item">
            <span className="stat-value">{userDecks.length}</span>
            <span className="stat-label">Total Decks</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {userDecks.filter((d) => d.format === 'commander').length}
            </span>
            <span className="stat-label">Commander</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {userDecks.filter((d) => d.format === 'standard').length}
            </span>
            <span className="stat-label">Standard</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {userDecks.filter((d) => d.isPublic).length}
            </span>
            <span className="stat-label">Public</span>
          </div>
        </div>
      )}
    </div>
  )
}
