import { useState } from 'react'
import { useCardSearch, type SearchFilters } from '../../hooks/useScryfall'
import { getCardImageUrl } from '../../types/card'
import type { ScryfallCard } from '../../types/card'
import './SearchPanel.css'

interface SearchPanelProps {
  selectedFormat: string
  isCommanderFormat: boolean
  onCardAdd: (card: ScryfallCard) => void
  onCommanderSet?: (card: ScryfallCard) => void
}

const CARD_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'creature', label: 'Creatures' },
  { value: 'instant', label: 'Instants' },
  { value: 'sorcery', label: 'Sorceries' },
  { value: 'enchantment', label: 'Enchantments' },
  { value: 'artifact', label: 'Artifacts' },
  { value: 'planeswalker', label: 'Planeswalkers' },
  { value: 'land', label: 'Lands' },
]

const RARITIES = [
  { value: '', label: 'Any Rarity' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
]

export default function SearchPanel({
  selectedFormat,
  isCommanderFormat,
  onCardAdd,
  onCommanderSet,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [isLegendary, setIsLegendary] = useState(false)
  const [colorFilters, setColorFilters] = useState<string[]>([])

  // Build filters object
  const filters: SearchFilters = {
    type: typeFilter || undefined,
    rarity: rarityFilter || undefined,
    isLegendary: isLegendary || undefined,
    colors: colorFilters.length > 0 ? colorFilters : undefined,
    format: selectedFormat !== 'all' ? selectedFormat : undefined,
  }

  const { cards, totalCards, isLoading, error } = useCardSearch(searchQuery, filters)

  const toggleColorFilter = (color: string) => {
    setColorFilters((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const clearFilters = () => {
    setTypeFilter('')
    setRarityFilter('')
    setIsLegendary(false)
    setColorFilters([])
  }

  const hasActiveFilters = typeFilter || rarityFilter || isLegendary || colorFilters.length > 0

  // Handle drag start - store card data
  const handleDragStart = (e: React.DragEvent, card: ScryfallCard) => {
    e.dataTransfer.setData('application/json', JSON.stringify(card))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // Check if card is legendary (for commander)
  const isLegendaryCreature = (card: ScryfallCard): boolean => {
    const typeLine = card.type_line?.toLowerCase() || ''
    return typeLine.includes('legendary') && typeLine.includes('creature')
  }

  return (
    <div className="search-panel">
      <div className="panel-header">
        <h3>🔍 Card Search</h3>
        <span className="format-badge">{selectedFormat}</span>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cards... (e.g., 'lightning', 'green lands')"
          className="search-input"
        />
        {isLoading && <div className="search-spinner">⏳</div>}
      </div>

      {/* Filter Toggle */}
      <div className="filter-toggle">
        <button
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          🔧 Filters {hasActiveFilters && <span className="filter-badge">{
            (typeFilter ? 1 : 0) + (rarityFilter ? 1 : 0) + (isLegendary ? 1 : 0) + colorFilters.length
          }</span>}
        </button>
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          {/* Card Type */}
          <div className="filter-row">
            <label>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              {CARD_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Rarity */}
          <div className="filter-row">
            <label>Rarity</label>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="filter-select"
            >
              {RARITIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Legendary Toggle */}
          <div className="filter-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isLegendary}
                onChange={(e) => setIsLegendary(e.target.checked)}
              />
              <span>👑 Legendary Only</span>
            </label>
          </div>

          {/* Color Filter */}
          <div className="filter-row">
            <label>Colors</label>
            <div className="color-filter-buttons">
              {[
                { code: 'W', symbol: '⚪', name: 'White' },
                { code: 'U', symbol: '🔵', name: 'Blue' },
                { code: 'B', symbol: '⚫', name: 'Black' },
                { code: 'R', symbol: '🔴', name: 'Red' },
                { code: 'G', symbol: '🟢', name: 'Green' },
              ].map(({ code, symbol, name }) => (
                <button
                  key={code}
                  className={`color-filter-btn ${colorFilters.includes(code) ? 'active' : ''}`}
                  onClick={() => toggleColorFilter(code)}
                  title={name}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCommanderFormat && (
        <div className="commander-notice">
          👑 Commander format - Click crown icon on legendary creatures
        </div>
      )}

      <div className="search-results">
        <div className="results-header">
          <span>Results</span>
          <span className="result-count">
            {isLoading ? 'Searching...' : `${totalCards} cards`}
          </span>
        </div>

        {error && (
          <div className="search-error">
            ⚠️ {error}
          </div>
        )}

        <div className="results-list">
          {cards.length === 0 && !isLoading && searchQuery.length >= 2 && (
            <div className="no-results">
              No cards found for "{searchQuery}"
            </div>
          )}

          {searchQuery.length < 2 && !isLoading && (
            <div className="search-hint">
              Type at least 2 characters to search
            </div>
          )}

          {cards.map((card) => (
            <div
              key={card.id}
              className="card-result"
              draggable
              onDragStart={(e) => handleDragStart(e, card)}
            >
              <div className="card-image-container">
                <img
                  src={getCardImageUrl(card, 'small')}
                  alt={card.name}
                  className="card-image"
                  loading="lazy"
                />
              </div>
              <div className="card-info">
                <span className="card-name">{card.name}</span>
                <span className="card-type">{card.type_line}</span>
                <span className="card-meta">
                  {card.mana_cost && <span className="mana-cost">{card.mana_cost}</span>}
                  {card.prices?.usd && (
                    <span className="card-price">${card.prices.usd}</span>
                  )}
                </span>
              </div>
              <div className="card-actions">
                <button
                  className="add-btn"
                  onClick={() => onCardAdd(card)}
                  title="Add to deck"
                >
                  +
                </button>
                {isCommanderFormat && isLegendaryCreature(card) && onCommanderSet && (
                  <button
                    className="commander-btn"
                    onClick={() => onCommanderSet(card)}
                    title="Set as commander"
                  >
                    👑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-footer">
        <small>💡 Drag cards to deck or click + to add</small>
      </div>
    </div>
  )
}
