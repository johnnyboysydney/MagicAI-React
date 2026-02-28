import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollection, type CollectionFilters, type SortOption } from '../../hooks/useCollection'
import { useCardSearch } from '../../hooks/useScryfall'
import { useAuth } from '../../contexts/AuthContext'
import { useDeck } from '../../contexts/DeckContext'
import type { ScryfallCard, DeckCard } from '../../types/card'
import { getCardImageUrl, getCardPrice } from '../../types/card'
import {
  type CardCondition,
  type CollectionCard as CollectionCardType,
  CONDITION_LABELS,
  CONDITION_MULTIPLIERS,
} from '../../services/collectionService'
import './Collection.css'

const CARD_TYPES = ['creature', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker', 'land']
const COLORS = [
  { id: 'W', label: 'White', symbol: 'W' },
  { id: 'U', label: 'Blue', symbol: 'U' },
  { id: 'B', label: 'Black', symbol: 'B' },
  { id: 'R', label: 'Red', symbol: 'R' },
  { id: 'G', label: 'Green', symbol: 'G' },
]
const RARITIES = ['common', 'uncommon', 'rare', 'mythic']
const FORMATS = ['standard', 'modern', 'pioneer', 'legacy', 'vintage', 'commander', 'pauper']
const CONDITIONS: CardCondition[] = ['mint', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged']

const ITEMS_PER_PAGE = 60

export default function Collection() {
  const {
    cards,
    filteredCards,
    stats,
    isLoading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    addCard,
    updateCard,
    removeCard,
    bulkImport,
  } = useCollection()
  const { user, useCredits } = useAuth()
  const { setBuilderState } = useDeck()
  const navigate = useNavigate()

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showAiBuildModal, setShowAiBuildModal] = useState(false)
  const [showCardDetail, setShowCardDetail] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Card detail editing
  const [editQty, setEditQty] = useState(0)
  const [editFoilQty, setEditFoilQty] = useState(0)
  const [editCondition, setEditCondition] = useState<CardCondition>('near_mint')

  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE)
  const paginatedCards = useMemo(
    () => filteredCards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredCards, currentPage]
  )

  // Reset page when filters change
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q)
    setCurrentPage(1)
  }, [setSearchQuery])

  const handleFilterChange = useCallback((newFilters: CollectionFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [setFilters])

  const handleSortChange = useCallback((s: SortOption) => {
    setSortBy(s)
    setCurrentPage(1)
  }, [setSortBy])

  // Open card detail for editing
  const handleCardClick = useCallback((scryfallId: string) => {
    const card = filteredCards.find((c) => c.scryfallId === scryfallId)
    if (card) {
      setEditQty(card.quantity)
      setEditFoilQty(card.foilQuantity)
      setEditCondition(card.condition)
      setShowCardDetail(scryfallId)
    }
  }, [filteredCards])

  const handleSaveCard = useCallback(async () => {
    if (!showCardDetail) return
    if (editQty <= 0 && editFoilQty <= 0) {
      await removeCard(showCardDetail)
    } else {
      await updateCard(showCardDetail, editQty, editFoilQty, editCondition)
    }
    setShowCardDetail(null)
  }, [showCardDetail, editQty, editFoilQty, editCondition, updateCard, removeCard])

  const handleDeleteCard = useCallback(async () => {
    if (!showCardDetail) return
    await removeCard(showCardDetail)
    setShowCardDetail(null)
  }, [showCardDetail, removeCard])

  const detailCard = showCardDetail ? filteredCards.find((c) => c.scryfallId === showCardDetail) : null

  // Open AI-generated deck in the Deck Builder
  const handleOpenInDeckBuilder = useCallback((
    generatedCards: Array<{ name: string; quantity: number }>,
    format: string,
    _strategy: string,
  ) => {
    // Convert AI result to DeckCard Map, matching collection cards where possible
    const deckCards = new Map<string, DeckCard>()

    for (const gc of generatedCards) {
      // Try to find the card in the user's collection for full data
      const collectionCard = cards.find(
        (c) => c.name.toLowerCase() === gc.name.toLowerCase()
      )

      const deckCard: DeckCard = {
        id: collectionCard?.scryfallId || gc.name.toLowerCase().replace(/\s+/g, '-'),
        name: gc.name,
        quantity: gc.quantity,
        scryfallData: {} as ScryfallCard, // Minimal - DeckBuilder will work without full Scryfall data
        cardType: (collectionCard?.cardType || 'other') as DeckCard['cardType'],
        cmc: collectionCard?.cmc || 0,
        colors: collectionCard?.colors || [],
        manaCost: collectionCard?.manaCost || '',
        price: collectionCard?.price || 0,
      }

      deckCards.set(gc.name, deckCard)
    }

    setBuilderState({
      deckName: `AI ${format.charAt(0).toUpperCase() + format.slice(1)} Deck`,
      selectedFormat: format,
      deckCards,
      commander: null,
    })

    setShowAiBuildModal(false)
    navigate('/deck-builder')
  }, [cards, setBuilderState, navigate])

  // Toggle color filter
  const toggleColorFilter = useCallback((color: string) => {
    handleFilterChange({
      ...filters,
      colors: filters.colors.includes(color)
        ? filters.colors.filter((c) => c !== color)
        : [...filters.colors, color],
    })
  }, [filters, handleFilterChange])

  const activeFilterCount = [
    filters.colors.length > 0,
    filters.types.length > 0,
    filters.rarity !== null,
    filters.format !== null,
  ].filter(Boolean).length

  const clearFilters = useCallback(() => {
    handleFilterChange({ colors: [], types: [], rarity: null, format: null, minPrice: null, maxPrice: null })
    setSearchQuery('')
  }, [handleFilterChange, setSearchQuery])

  // Only show full loading screen on initial load (no cards yet)
  // This prevents modals from being destroyed during background re-fetches
  if (isLoading && cards.length === 0) {
    return (
      <div className="collection-page">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading collection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="collection-page">
      {/* Header */}
      <div className="collection-header">
        <div className="collection-header-info">
          <h1>My Collection</h1>
          <p className="collection-subtitle">
            {stats.totalCards.toLocaleString()} cards &middot; ${stats.adjustedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} estimated value
          </p>
        </div>
        <div className="collection-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
            Import List
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Cards
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="collection-filters">
        <div className="search-box">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            placeholder="Search your collection..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => handleSearchChange('')}>&times;</button>
          )}
        </div>

        <div className="filter-controls">
          {/* Color filters */}
          <div className="color-filters">
            {COLORS.map((c) => (
              <button
                key={c.id}
                className={`color-btn color-${c.id.toLowerCase()} ${filters.colors.includes(c.id) ? 'active' : ''}`}
                onClick={() => toggleColorFilter(c.id)}
                title={c.label}
              >
                {c.symbol}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={filters.types[0] || ''}
            onChange={(e) =>
              handleFilterChange({ ...filters, types: e.target.value ? [e.target.value] : [] })
            }
            className="filter-select"
          >
            <option value="">All Types</option>
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          {/* Rarity filter */}
          <select
            value={filters.rarity || ''}
            onChange={(e) =>
              handleFilterChange({ ...filters, rarity: e.target.value || null })
            }
            className="filter-select"
          >
            <option value="">All Rarities</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>

          {/* Format filter */}
          <select
            value={filters.format || ''}
            onChange={(e) =>
              handleFilterChange({ ...filters, format: e.target.value || null })
            }
            className="filter-select"
          >
            <option value="">All Formats</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="filter-select"
          >
            <option value="name">Sort: Name</option>
            <option value="price-desc">Sort: Price (High)</option>
            <option value="price-asc">Sort: Price (Low)</option>
            <option value="rarity">Sort: Rarity</option>
            <option value="color">Sort: Color</option>
            <option value="type">Sort: Type</option>
            <option value="quantity">Sort: Quantity</option>
            <option value="added">Sort: Recently Added</option>
          </select>

          {activeFilterCount > 0 && (
            <button className="btn btn-small clear-filters-btn" onClick={clearFilters}>
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="collection-main">
        {/* Card grid */}
        <div className="collection-grid-section">
          {filteredCards.length === 0 ? (
            <div className="empty-collection">
              {stats.uniqueCards === 0 ? (
                <>
                  <span className="empty-icon">&#128230;</span>
                  <h3>Your collection is empty</h3>
                  <p>Start by adding cards to track your Magic: The Gathering collection.</p>
                  <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    + Add Your First Cards
                  </button>
                </>
              ) : (
                <>
                  <span className="empty-icon">&#128269;</span>
                  <h3>No cards match your filters</h3>
                  <button className="btn btn-secondary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="collection-card-grid">
                {paginatedCards.map((card) => (
                  <div
                    key={card.scryfallId}
                    className="collection-card-item"
                    onClick={() => handleCardClick(card.scryfallId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCardClick(card.scryfallId)}
                  >
                    <div className="card-image-wrapper">
                      <img
                        src={card.imageUri}
                        alt={card.name}
                        className="card-image"
                        loading="lazy"
                      />
                      <div className="card-qty-badge">
                        x{card.quantity + card.foilQuantity}
                      </div>
                      {card.foilQuantity > 0 && (
                        <div className="card-foil-badge">F</div>
                      )}
                      <div className={`card-rarity-dot rarity-${card.rarity}`} />
                    </div>
                    <div className="card-item-info">
                      <span className="card-item-name">{card.name}</span>
                      <span className="card-item-price">
                        ${(card.quantity * card.price + card.foilQuantity * card.foilPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-small"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-small"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="collection-sidebar">
          <div className="sidebar-card">
            <h3>Collection Stats</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span>Total Cards</span>
                <span className="stat-val">{stats.totalCards.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span>Unique Cards</span>
                <span className="stat-val">{stats.uniqueCards.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span>Foil Cards</span>
                <span className="stat-val">{stats.foilCount.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span>Raw Value</span>
                <span className="stat-val">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="stat-row">
                <span>Adjusted Value</span>
                <span className="stat-val highlight">${stats.adjustedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Color Distribution */}
          {stats.uniqueCards > 0 && (
            <div className="sidebar-card">
              <h3>Colors</h3>
              <div className="color-bars">
                {COLORS.map((c) => {
                  const count = stats.colorDistribution[c.id] || 0
                  const pct = stats.uniqueCards > 0 ? (count / stats.uniqueCards) * 100 : 0
                  return (
                    <div key={c.id} className="color-bar-row">
                      <span className={`color-label color-${c.id.toLowerCase()}`}>{c.symbol}</span>
                      <div className="color-bar-track">
                        <div
                          className={`color-bar-fill color-fill-${c.id.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="color-count">{count}</span>
                    </div>
                  )
                })}
                <div className="color-bar-row">
                  <span className="color-label color-c">C</span>
                  <div className="color-bar-track">
                    <div
                      className="color-bar-fill color-fill-c"
                      style={{ width: `${stats.uniqueCards > 0 ? ((stats.colorDistribution['C'] || 0) / stats.uniqueCards) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="color-count">{stats.colorDistribution['C'] || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Value Cards */}
          {stats.topValueCards.length > 0 && (
            <div className="sidebar-card">
              <h3>Most Valuable</h3>
              <div className="top-cards-list">
                {stats.topValueCards.map((card, i) => (
                  <div key={card.scryfallId} className="top-card-row" onClick={() => handleCardClick(card.scryfallId)}>
                    <span className="top-rank">#{i + 1}</span>
                    <span className="top-name">{card.name}</span>
                    <span className="top-price">${(card.quantity * card.price + card.foilQuantity * card.foilPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-card ai-build-card">
            <div className="ai-build-header">
              <div className="ai-build-badge">AI</div>
              <h3>Smart Deck Builder</h3>
              <div className="ai-info-tooltip">
                <span className="ai-info-icon">i</span>
                <div className="ai-info-popup">
                  <strong>How it works</strong>
                  <p>Our AI analyzes every card in your collection and builds an optimized deck tailored to your chosen format and strategy.</p>
                  <ul>
                    <li>Respects format legality rules</li>
                    <li>Builds a balanced mana curve</li>
                    <li>Uses only cards you own</li>
                    <li>Explains the strategy behind each build</li>
                  </ul>
                  <span className="ai-info-cost">10 credits per generation</span>
                </div>
              </div>
            </div>
            <p className="ai-build-desc">
              {stats.uniqueCards >= 2
                ? `AI analyzes your ${stats.uniqueCards} cards and crafts an optimized deck for any format.`
                : 'Add at least 2 cards to your collection and let AI craft an optimized deck for any format.'}
            </p>
            <div className="ai-format-tags">
              <span className="ai-format-tag">Standard</span>
              <span className="ai-format-tag">Modern</span>
              <span className="ai-format-tag">Pioneer</span>
              <span className="ai-format-tag">Commander</span>
              <span className="ai-format-tag">+3</span>
            </div>
            {stats.uniqueCards < 2 && (
              <p className="ai-min-cards-note">
                You need at least 2 cards in your collection to use AI deck building.
              </p>
            )}
            <button
              className="btn btn-ai-build"
              onClick={() => setShowAiBuildModal(true)}
              disabled={stats.uniqueCards < 2}
            >
              <span className="ai-btn-icon">&#9733;</span>
              Build Deck from Collection
            </button>
            <div className="ai-cost-row">
              <span className="ai-cost-hint">10 credits per build</span>
              <span className="ai-credits-remaining">{user?.credits ?? 0} available</span>
            </div>
          </div>

          <div className="collection-results-count">
            Showing {filteredCards.length} of {stats.uniqueCards} cards
          </div>
        </div>
      </div>

      {/* Add Cards Modal */}
      {showAddModal && (
        <AddCardModal
          onClose={() => setShowAddModal(false)}
          onAdd={addCard}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onImport={bulkImport}
        />
      )}

      {/* AI Build Modal */}
      {showAiBuildModal && (
        <AiBuildModal
          cards={cards}
          userCredits={user?.credits ?? 0}
          onClose={() => setShowAiBuildModal(false)}
          onUseCredits={useCredits}
          onOpenInDeckBuilder={handleOpenInDeckBuilder}
        />
      )}

      {/* Card Detail Modal */}
      {detailCard && showCardDetail && (
        <div className="modal-overlay" onClick={() => setShowCardDetail(null)}>
          <div className="modal-content card-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCardDetail(null)}>&times;</button>
            <div className="card-detail-layout">
              <img src={detailCard.imageUri} alt={detailCard.name} className="card-detail-image" />
              <div className="card-detail-info">
                <h2>{detailCard.name}</h2>
                <p className="card-detail-type">{detailCard.typeLine}</p>
                <p className="card-detail-set">{detailCard.setName} ({detailCard.setCode.toUpperCase()})</p>
                <p className="card-detail-rarity">{detailCard.rarity.charAt(0).toUpperCase() + detailCard.rarity.slice(1)}</p>

                <div className="card-detail-prices">
                  <span>Regular: ${detailCard.price.toFixed(2)}</span>
                  {detailCard.foilPrice > 0 && <span>Foil: ${detailCard.foilPrice.toFixed(2)}</span>}
                </div>

                <div className="card-detail-fields">
                  <label>
                    Regular Qty
                    <input
                      type="number"
                      min="0"
                      value={editQty}
                      onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="edit-input"
                    />
                  </label>
                  <label>
                    Foil Qty
                    <input
                      type="number"
                      min="0"
                      value={editFoilQty}
                      onChange={(e) => setEditFoilQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="edit-input"
                    />
                  </label>
                  <label>
                    Condition
                    <select
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value as CardCondition)}
                      className="edit-input"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="card-detail-value">
                  Value: ${((editQty * detailCard.price + editFoilQty * detailCard.foilPrice) * CONDITION_MULTIPLIERS[editCondition]).toFixed(2)}
                  <span className="condition-mult"> ({(CONDITION_MULTIPLIERS[editCondition] * 100).toFixed(0)}%)</span>
                </p>

                <div className="card-detail-actions">
                  <button className="btn btn-danger" onClick={handleDeleteCard}>Remove</button>
                  <button className="btn btn-primary" onClick={handleSaveCard}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Add Card Modal ---
function AddCardModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (card: ScryfallCard, qty: number, foilQty: number, condition: CardCondition) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const { cards, isLoading } = useCardSearch(query)
  const [addingId, setAddingId] = useState<string | null>(null)

  // Per-card add state
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [foilQuantities, setFoilQuantities] = useState<Record<string, number>>({})
  const [conditions, setConditions] = useState<Record<string, CardCondition>>({})

  const getQty = (id: string) => quantities[id] ?? 1
  const getFoilQty = (id: string) => foilQuantities[id] ?? 0
  const getCondition = (id: string) => conditions[id] ?? 'near_mint'

  const handleAdd = async (card: ScryfallCard) => {
    setAddingId(card.id)
    try {
      await onAdd(card, getQty(card.id), getFoilQty(card.id), getCondition(card.id))
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Add Cards to Collection</h2>

        <input
          type="text"
          placeholder="Search Scryfall for cards..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="modal-search-input"
          autoFocus
        />

        <div className="add-card-results">
          {isLoading && <div className="add-card-loading">Searching...</div>}
          {!isLoading && query.length >= 2 && cards.length === 0 && (
            <div className="add-card-empty">No cards found</div>
          )}
          {cards.slice(0, 20).map((card) => (
            <div key={card.id} className="add-card-row">
              <img
                src={getCardImageUrl(card, 'small')}
                alt={card.name}
                className="add-card-thumb"
              />
              <div className="add-card-info">
                <span className="add-card-name">{card.name}</span>
                <span className="add-card-meta">
                  {card.type_line} &middot; {card.set_name} &middot; ${getCardPrice(card).toFixed(2)}
                </span>
              </div>
              <div className="add-card-controls">
                <label className="qty-label">
                  Qty
                  <input
                    type="number"
                    min="0"
                    value={getQty(card.id)}
                    onChange={(e) =>
                      setQuantities((p) => ({ ...p, [card.id]: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className="qty-input"
                  />
                </label>
                <label className="qty-label">
                  Foil
                  <input
                    type="number"
                    min="0"
                    value={getFoilQty(card.id)}
                    onChange={(e) =>
                      setFoilQuantities((p) => ({ ...p, [card.id]: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className="qty-input"
                  />
                </label>
                <select
                  value={getCondition(card.id)}
                  onChange={(e) =>
                    setConditions((p) => ({ ...p, [card.id]: e.target.value as CardCondition }))
                  }
                  className="condition-select"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleAdd(card)}
                  disabled={addingId === card.id}
                >
                  {addingId === card.id ? '...' : '+ Add'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Bulk Import Modal ---
function BulkImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void
  onImport: (text: string) => Promise<{ added: number; failed: string[] }>
}) {
  const [text, setText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; failed: string[] } | null>(null)

  const handleImport = async () => {
    if (!text.trim()) return
    setIsImporting(true)
    setResult(null)
    try {
      const res = await onImport(text)
      setResult(res)
      if (res.failed.length === 0) {
        setText('')
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2>Bulk Import Cards</h2>
        <p className="bulk-help">
          Paste your card list below. Format: one card per line, with optional quantity prefix.
        </p>
        <div className="bulk-examples">
          <code>4 Lightning Bolt</code>
          <code>2x Sol Ring</code>
          <code>Mana Crypt</code>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bulk-textarea"
          placeholder="4 Lightning Bolt&#10;2 Sol Ring&#10;1 Mana Crypt&#10;..."
          rows={10}
        />

        {result && (
          <div className="bulk-result">
            <p className="bulk-success">Added {result.added} cards successfully.</p>
            {result.failed.length > 0 && (
              <div className="bulk-failures">
                <p>Failed to find {result.failed.length} card(s):</p>
                <ul>
                  {result.failed.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bulk-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={isImporting || !text.trim()}
          >
            {isImporting ? 'Importing...' : 'Import List'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- AI Build from Collection Modal ---
function AiBuildModal({
  cards,
  userCredits,
  onClose,
  onUseCredits,
  onOpenInDeckBuilder,
}: {
  cards: CollectionCardType[]
  userCredits: number
  onClose: () => void
  onUseCredits: (amount: number) => Promise<void>
  onOpenInDeckBuilder: (cards: Array<{ name: string; quantity: number }>, format: string, strategy: string) => void
}) {
  const [format, setFormat] = useState('standard')
  const [archetype, setArchetype] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{ strategy: string; cards: Array<{ name: string; quantity: number }> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (userCredits < 10) {
      setError('Not enough credits. You need 10 credits for AI deck building.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API key not configured.')
      }

      const cardList = cards
        .map((c) => `${c.quantity + c.foilQuantity}x ${c.name}`)
        .join('\n')

      const deckSize = format === 'commander' ? 100 : 60
      const archetypeHint = archetype ? `\nFocus on a ${archetype} strategy if possible.` : ''

      const prompt = `You are a Magic: The Gathering deck building expert.
The user owns these cards:
${cardList}

Build the best possible ${format} deck using ONLY cards from this list.
The deck must contain exactly ${deckSize} cards including lands.
Respect ${format} format legality and the ${format === 'commander' ? 'singleton (max 1 copy)' : 'max 4 copies'} rule.${archetypeHint}

Return your response in this exact JSON format:
{
  "strategy": "2-3 sentence explanation of the deck strategy",
  "cards": [
    {"name": "Card Name", "quantity": 4},
    {"name": "Another Card", "quantity": 2}
  ]
}

IMPORTANT: Only use cards from the list above. Include basic lands as needed to reach ${deckSize} cards.
Return ONLY the JSON, no other text.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      )

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('AI service is temporarily busy. Please wait a moment and try again.')
        }
        throw new Error(`AI request failed (${response.status}). Please try again later.`)
      }

      const data = await response.json()
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!generatedText) {
        throw new Error('No response from AI')
      }

      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      await onUseCredits(10)

      setResult({
        strategy: parsed.strategy || 'AI-generated deck',
        cards: parsed.cards || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deck')
    } finally {
      setIsGenerating(false)
    }
  }

  const totalCards = result?.cards.reduce((sum, c) => sum + c.quantity, 0) ?? 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-build-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="ai-modal-header">
          <div className="ai-modal-badge">AI</div>
          <div>
            <h2>Smart Deck Builder</h2>
            <p className="ai-modal-desc">
              AI will analyze your {cards.length} cards and build the best possible deck for your chosen format.
            </p>
          </div>
        </div>

        {!result ? (
          <>
            <div className="ai-build-options">
              <label>
                Format
                <select value={format} onChange={(e) => setFormat(e.target.value)} className="edit-input">
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label>
                Archetype (optional)
                <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="edit-input">
                  <option value="">Any / Best Available</option>
                  <option value="Aggro">Aggro</option>
                  <option value="Midrange">Midrange</option>
                  <option value="Control">Control</option>
                  <option value="Combo">Combo</option>
                  <option value="Tempo">Tempo</option>
                </select>
              </label>
            </div>

            {error && (
              <div className="ai-error-box">
                <span className="ai-error-icon">!</span>
                <div>
                  <strong>Generation Failed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="ai-generating-box">
                <div className="ai-generating-spinner" />
                <div>
                  <strong>Building your deck...</strong>
                  <p>AI is analyzing {cards.length} cards and finding the best {format} build. This may take a few seconds.</p>
                </div>
              </div>
            )}

            <div className="ai-build-footer">
              <span className="credits-note">Cost: 10 credits (you have {userCredits})</span>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating || userCredits < 10}
              >
                {isGenerating ? 'Generating...' : 'Generate Deck'}
              </button>
            </div>
          </>
        ) : (
          <div className="ai-result">
            <div className="ai-strategy">
              <h3>Strategy</h3>
              <p>{result.strategy}</p>
            </div>
            <div className="ai-decklist">
              <h3>Deck List ({totalCards} cards)</h3>
              <div className="ai-card-list">
                {result.cards.map((card, i) => (
                  <div key={i} className="ai-card-row">
                    <span className="ai-card-qty">{card.quantity}x</span>
                    <span className="ai-card-name">{card.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ai-result-actions">
              <button className="btn btn-secondary" onClick={() => setResult(null)}>
                Try Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const deckText = result.cards.map((c) => `${c.quantity} ${c.name}`).join('\n')
                  navigator.clipboard.writeText(deckText)
                }}
              >
                Copy List
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onOpenInDeckBuilder(result.cards, format, result.strategy)}
              >
                Open in Deck Builder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
