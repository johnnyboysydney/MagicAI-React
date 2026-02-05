import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeck } from '../../contexts/DeckContext'
import type { DeckCard } from '../../types/card'
import './PublicDecks.css'

type SortOption = 'popular' | 'recent' | 'name' | 'format'
type FilterFormat = 'all' | 'standard' | 'modern' | 'commander' | 'pioneer' | 'legacy' | 'vintage' | 'pauper'

// Mock public decks data
interface PublicDeck {
  id: string
  name: string
  format: string
  description: string
  authorId: string
  authorName: string
  authorAvatar?: string
  cards: Map<string, DeckCard>
  commander: DeckCard | null
  createdAt: string
  updatedAt: string
  likes: number
  views: number
  tags: string[]
  cardCount: number
}

const MOCK_PUBLIC_DECKS: PublicDeck[] = [
  {
    id: 'pub-1',
    name: 'Mono Red Aggro',
    format: 'standard',
    description: 'Fast and aggressive burn deck. Win by turn 4-5 or go home.',
    authorId: 'user-1',
    authorName: 'BurnMaster99',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-28T10:00:00Z',
    updatedAt: '2025-02-01T15:30:00Z',
    likes: 245,
    views: 1240,
    tags: ['aggro', 'burn', 'budget', 'competitive'],
    cardCount: 60,
  },
  {
    id: 'pub-2',
    name: 'Azorius Control',
    format: 'modern',
    description: 'Classic draw-go control with Teferi and counterspells. Patience is key.',
    authorId: 'user-2',
    authorName: 'ControlFreak',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-20T08:00:00Z',
    updatedAt: '2025-01-30T12:00:00Z',
    likes: 189,
    views: 892,
    tags: ['control', 'competitive', 'teferi'],
    cardCount: 60,
  },
  {
    id: 'pub-3',
    name: 'Krenko Goblin Tribal',
    format: 'commander',
    description: 'Make infinite goblins, swing for lethal. Simple but effective.',
    authorId: 'user-3',
    authorName: 'GoblinKing',
    cards: new Map(),
    commander: {
      id: 'krenko',
      name: 'Krenko, Mob Boss',
      manaCost: '{2}{R}{R}',
      cmc: 4,
      colors: ['R'],
      cardType: 'creature',
      price: 5.99,
      quantity: 1,
      scryfallData: {
        id: 'krenko',
        name: 'Krenko, Mob Boss',
        cmc: 4,
        type_line: 'Legendary Creature — Goblin Warrior',
        color_identity: ['R'],
        legalities: {},
        set: 'ddn',
        set_name: 'Duel Decks: Speed vs. Cunning',
        rarity: 'rare',
        prices: { usd: '5.99' },
      },
    },
    createdAt: '2025-01-15T14:00:00Z',
    updatedAt: '2025-02-02T18:45:00Z',
    likes: 456,
    views: 2100,
    tags: ['tribal', 'aggro', 'tokens', 'casual'],
    cardCount: 100,
  },
  {
    id: 'pub-4',
    name: 'Simic Ramp',
    format: 'pioneer',
    description: 'Ramp into massive threats. Cavalier of Thorns into Nissa into Ulamog.',
    authorId: 'user-4',
    authorName: 'RampSquad',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-25T09:00:00Z',
    updatedAt: '2025-01-29T11:00:00Z',
    likes: 98,
    views: 445,
    tags: ['ramp', 'midrange', 'creatures'],
    cardCount: 60,
  },
  {
    id: 'pub-5',
    name: 'Urza Artifacts',
    format: 'commander',
    description: 'Combo-control with infinite mana possibilities. High skill ceiling.',
    authorId: 'user-5',
    authorName: 'ArtifactMage',
    cards: new Map(),
    commander: {
      id: 'urza',
      name: 'Urza, Lord High Artificer',
      manaCost: '{2}{U}{U}',
      cmc: 4,
      colors: ['U'],
      cardType: 'creature',
      price: 35.99,
      quantity: 1,
      scryfallData: {
        id: 'urza',
        name: 'Urza, Lord High Artificer',
        cmc: 4,
        type_line: 'Legendary Creature — Human Artificer',
        color_identity: ['U'],
        legalities: {},
        set: 'mh1',
        set_name: 'Modern Horizons',
        rarity: 'mythic',
        prices: { usd: '35.99' },
      },
    },
    createdAt: '2025-01-18T16:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z',
    likes: 312,
    views: 1567,
    tags: ['combo', 'artifacts', 'competitive', 'cedh'],
    cardCount: 100,
  },
  {
    id: 'pub-6',
    name: 'Mono Black Devotion',
    format: 'pauper',
    description: 'Budget-friendly devotion deck that punishes fair decks.',
    authorId: 'user-6',
    authorName: 'PauperChamp',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-22T12:00:00Z',
    updatedAt: '2025-01-28T14:00:00Z',
    likes: 67,
    views: 320,
    tags: ['devotion', 'budget', 'midrange'],
    cardCount: 60,
  },
  {
    id: 'pub-7',
    name: 'Boros Burn',
    format: 'legacy',
    description: 'Classic legacy burn with white splash for sideboard options.',
    authorId: 'user-7',
    authorName: 'LegacyBurner',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-25T16:00:00Z',
    likes: 145,
    views: 678,
    tags: ['burn', 'aggro', 'legacy'],
    cardCount: 60,
  },
  {
    id: 'pub-8',
    name: 'Atraxa Superfriends',
    format: 'commander',
    description: 'Proliferate planeswalkers to victory. Ultimate value engine.',
    authorId: 'user-8',
    authorName: 'WalkerWarden',
    cards: new Map(),
    commander: {
      id: 'atraxa',
      name: 'Atraxa, Praetors\' Voice',
      manaCost: '{G}{W}{U}{B}',
      cmc: 4,
      colors: ['W', 'U', 'B', 'G'],
      cardType: 'creature',
      price: 24.99,
      quantity: 1,
      scryfallData: {
        id: 'atraxa',
        name: 'Atraxa, Praetors\' Voice',
        cmc: 4,
        type_line: 'Legendary Creature — Phyrexian Angel Horror',
        color_identity: ['W', 'U', 'B', 'G'],
        legalities: {},
        set: 'c16',
        set_name: 'Commander 2016',
        rarity: 'mythic',
        prices: { usd: '24.99' },
      },
    },
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-01-30T20:00:00Z',
    likes: 523,
    views: 2890,
    tags: ['planeswalkers', 'superfriends', 'proliferate'],
    cardCount: 100,
  },
]

export default function PublicDecks() {
  const navigate = useNavigate()
  const { setDeckForAnalysis } = useDeck()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [filterFormat, setFilterFormat] = useState<FilterFormat>('all')

  // Filter and sort decks
  const filteredDecks = useMemo(() => {
    let decks = [...MOCK_PUBLIC_DECKS]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      decks = decks.filter(
        (deck) =>
          deck.name.toLowerCase().includes(query) ||
          deck.description.toLowerCase().includes(query) ||
          deck.authorName.toLowerCase().includes(query) ||
          deck.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Filter by format
    if (filterFormat !== 'all') {
      decks = decks.filter((deck) => deck.format === filterFormat)
    }

    // Sort
    decks.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.likes - a.likes
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

    return decks
  }, [searchQuery, sortBy, filterFormat])

  const handleViewDeck = (deck: PublicDeck) => {
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
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Updated</option>
              <option value="name">Name</option>
              <option value="format">Format</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}
        {filterFormat !== 'all' && ` in ${filterFormat}`}
      </div>

      {/* Deck Grid */}
      {filteredDecks.length > 0 ? (
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
                    <span className="card-count">{deck.cardCount} cards</span>
                  </div>
                </div>
                <div className="deck-stats">
                  <span className="stat likes">
                    <span className="stat-icon">❤️</span>
                    {formatNumber(deck.likes)}
                  </span>
                  <span className="stat views">
                    <span className="stat-icon">👁️</span>
                    {formatNumber(deck.views)}
                  </span>
                </div>
              </div>

              <p className="deck-description">{deck.description}</p>

              {deck.tags.length > 0 && (
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
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
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
        </div>
      )}

      {/* Format Stats */}
      <div className="format-stats">
        <h3>Browse by Format</h3>
        <div className="format-cards">
          {['standard', 'modern', 'commander', 'pioneer', 'legacy', 'pauper'].map((format) => {
            const count = MOCK_PUBLIC_DECKS.filter((d) => d.format === format).length
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
    </div>
  )
}
