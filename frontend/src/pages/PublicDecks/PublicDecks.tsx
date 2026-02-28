import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeck } from '../../contexts/DeckContext'
import type { Deck } from '../../contexts/DeckContext'
import { getPublicDecks, firestoreDeckToAppDeck } from '../../services/deckService'
import './PublicDecks.css'

type SortOption = 'popular' | 'recent' | 'name' | 'format'
type FilterFormat = 'all' | 'standard' | 'modern' | 'commander' | 'pioneer' | 'legacy' | 'vintage' | 'pauper'

export default function PublicDecks() {
  const navigate = useNavigate()
  const { setDeckForAnalysis } = useDeck()

  const [decks, setDecks] = useState<Deck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [filterFormat, setFilterFormat] = useState<FilterFormat>('all')

  // Load public decks from Firestore
  useEffect(() => {
    const loadPublicDecks = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const firestoreDecks = await getPublicDecks(50)
        const appDecks = firestoreDecks.map(firestoreDeckToAppDeck)
        setDecks(appDecks)
      } catch (err) {
        console.error('Failed to load public decks:', err)
        setError('Failed to load public decks')
      } finally {
        setIsLoading(false)
      }
    }
    loadPublicDecks()
  }, [])

  // Filter and sort decks
  const filteredDecks = useMemo(() => {
    let result = [...decks]

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (deck) =>
          deck.name.toLowerCase().includes(q) ||
          deck.description?.toLowerCase().includes(q) ||
          deck.authorName.toLowerCase().includes(q) ||
          deck.tags?.some((tag) => tag.toLowerCase().includes(q))
      )
    }

    // Filter by format
    if (filterFormat !== 'all') {
      result = result.filter((deck) => deck.format === filterFormat)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.likeCount || 0) - (a.likeCount || 0)
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'format':
          return a.format.localeCompare(b.format)
        default:
          return 0
      }
    })

    return result
  }, [decks, searchQuery, sortBy, filterFormat])

  const handleViewDeck = (deck: Deck) => {
    setDeckForAnalysis(deck.name, deck.format, deck.cards, deck.commander)
    navigate('/analysis')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
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
    <div className="public-decks-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Public Decks</h1>
          <p className="header-subtitle">
            Explore decks shared by the community
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search decks, authors, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              x
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
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Updated</option>
              <option value="name">Name</option>
              <option value="format">Format</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="results-info">
          Showing {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}
          {filterFormat !== 'all' && ` in ${filterFormat}`}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="empty-state">
          <div className="empty-icon">...</div>
          <h2>Loading public decks...</h2>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="empty-state">
          <div className="empty-icon">!</div>
          <h2>{error}</h2>
          <button className="clear-filters-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Deck Grid */}
      {!isLoading && !error && filteredDecks.length > 0 && (
        <div className="decks-grid">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="deck-card" onClick={() => handleViewDeck(deck)}>
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
                  </div>
                </div>
                <div className="deck-stats">
                  <span className="stat likes">
                    <span className="stat-icon">&#10084;&#65039;</span>
                    {formatNumber(deck.likeCount || 0)}
                  </span>
                  <span className="stat views">
                    <span className="stat-icon">&#128065;&#65039;</span>
                    {formatNumber(deck.viewCount || 0)}
                  </span>
                </div>
              </div>

              {deck.description && (
                <p className="deck-description">{deck.description}</p>
              )}

              {deck.tags && deck.tags.length > 0 && (
                <div className="deck-tags">
                  {deck.tags.slice(0, 4).map((tag, i) => (
                    <span key={i} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {deck.commander && (
                <div className="commander-row">
                  <span className="commander-label">Commander:</span>
                  <span className="commander-name">{deck.commander.name}</span>
                </div>
              )}

              <div className="deck-footer">
                <div className="author-info">
                  <div className="author-avatar">
                    {deck.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="author-name">{deck.authorName}</span>
                </div>
                <span className="updated-at">{formatDate(deck.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredDecks.length === 0 && (
        <div className="empty-state">
          {decks.length === 0 ? (
            <>
              <div className="empty-icon">&#127758;</div>
              <h2>No public decks yet</h2>
              <p>Be the first to share a deck with the community!</p>
            </>
          ) : (
            <>
              <div className="empty-icon">&#128269;</div>
              <h2>No decks found</h2>
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

      {/* Format Stats */}
      {decks.length > 0 && (
        <div className="format-stats">
          <h3>Browse by Format</h3>
          <div className="format-cards">
            {['standard', 'modern', 'commander', 'pioneer', 'legacy', 'pauper'].map((format) => {
              const count = decks.filter((d) => d.format === format).length
              return (
                <button
                  key={format}
                  className={`format-card ${filterFormat === format ? 'active' : ''}`}
                  onClick={() => setFilterFormat(format as FilterFormat)}
                >
                  <span
                    className="format-dot"
                    style={{ background: getFormatColor(format) }}
                  />
                  <span className="format-name">
                    {format.charAt(0).toUpperCase() + format.slice(1)}
                  </span>
                  <span className="format-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
