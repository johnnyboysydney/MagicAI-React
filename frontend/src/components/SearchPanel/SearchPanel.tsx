import { useState, useRef, useCallback } from 'react'
import { useCardSearch, type SearchFilters } from '../../hooks/useScryfall'
import { getCardImageUrl } from '../../types/card'
import type { ScryfallCard } from '../../types/card'
import './SearchPanel.css'

interface HoveredCard {
  card: ScryfallCard
  position: { top: number; left: number }
}

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
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Basic filter state
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [isLegendary, setIsLegendary] = useState(false)
  const [colorFilters, setColorFilters] = useState<string[]>([])

  // Advanced filter state
  const [cmcMin, setCmcMin] = useState('')
  const [cmcMax, setCmcMax] = useState('')
  const [powerMin, setPowerMin] = useState('')
  const [powerMax, setPowerMax] = useState('')
  const [toughnessMin, setToughnessMin] = useState('')
  const [toughnessMax, setToughnessMax] = useState('')
  const [oracleText, setOracleText] = useState('')
  const [setCode, setSetCode] = useState('')

  // Build filters object
  const filters: SearchFilters = {
    type: typeFilter || undefined,
    rarity: rarityFilter || undefined,
    isLegendary: isLegendary || undefined,
    colors: colorFilters.length > 0 ? colorFilters : undefined,
    format: selectedFormat !== 'all' ? selectedFormat : undefined,
    cmcMin: cmcMin ? Number(cmcMin) : undefined,
    cmcMax: cmcMax ? Number(cmcMax) : undefined,
    powerMin: powerMin ? Number(powerMin) : undefined,
    powerMax: powerMax ? Number(powerMax) : undefined,
    toughnessMin: toughnessMin ? Number(toughnessMin) : undefined,
    toughnessMax: toughnessMax ? Number(toughnessMax) : undefined,
    oracleText: oracleText || undefined,
    setCode: setCode || undefined,
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
    setCmcMin('')
    setCmcMax('')
    setPowerMin('')
    setPowerMax('')
    setToughnessMin('')
    setToughnessMax('')
    setOracleText('')
    setSetCode('')
    setShowAdvanced(false)
  }

  const basicFilterCount = (typeFilter ? 1 : 0) + (rarityFilter ? 1 : 0) + (isLegendary ? 1 : 0) + colorFilters.length
  const advancedFilterCount = (cmcMin ? 1 : 0) + (cmcMax ? 1 : 0) + (powerMin ? 1 : 0) + (powerMax ? 1 : 0) +
    (toughnessMin ? 1 : 0) + (toughnessMax ? 1 : 0) + (oracleText ? 1 : 0) + (setCode ? 1 : 0)
  const totalFilterCount = basicFilterCount + advancedFilterCount
  const hasActiveFilters = totalFilterCount > 0

  // Hover preview state - tracks which card is hovered and where to show popup
  const [hoveredCard, setHoveredCard] = useState<HoveredCard | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCardMouseEnter = useCallback((card: ScryfallCard, e: React.MouseEvent<HTMLImageElement>) => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredCard({
      card,
      position: {
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      },
    })
  }, [])

  const handleCardMouseLeave = useCallback(() => {
    // Delay hiding to allow moving to the popup
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null)
    }, 100)
  }, [])

  const handlePopupMouseEnter = useCallback(() => {
    // Cancel hide when entering popup
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const handlePopupMouseLeave = useCallback(() => {
    setHoveredCard(null)
  }, [])

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
          🔧 Filters {hasActiveFilters && <span className="filter-badge">{totalFilterCount}</span>}
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

          {/* Advanced Filter Toggle */}
          <button
            type="button"
            className={`advanced-toggle-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▾' : '▸'} Advanced Filters
            {advancedFilterCount > 0 && <span className="filter-badge">{advancedFilterCount}</span>}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="advanced-filters">
              {/* Mana Value (CMC) Range */}
              <div className="filter-row">
                <label>Mana Value</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={cmcMin}
                    onChange={(e) => setCmcMin(e.target.value)}
                    placeholder="Min"
                    className="range-input"
                  />
                  <span className="range-separator">to</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={cmcMax}
                    onChange={(e) => setCmcMax(e.target.value)}
                    placeholder="Max"
                    className="range-input"
                  />
                </div>
              </div>

              {/* Power Range */}
              <div className="filter-row">
                <label>Power</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={powerMin}
                    onChange={(e) => setPowerMin(e.target.value)}
                    placeholder="Min"
                    className="range-input"
                  />
                  <span className="range-separator">to</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={powerMax}
                    onChange={(e) => setPowerMax(e.target.value)}
                    placeholder="Max"
                    className="range-input"
                  />
                </div>
              </div>

              {/* Toughness Range */}
              <div className="filter-row">
                <label>Toughness</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={toughnessMin}
                    onChange={(e) => setToughnessMin(e.target.value)}
                    placeholder="Min"
                    className="range-input"
                  />
                  <span className="range-separator">to</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={toughnessMax}
                    onChange={(e) => setToughnessMax(e.target.value)}
                    placeholder="Max"
                    className="range-input"
                  />
                </div>
              </div>

              {/* Oracle Text */}
              <div className="filter-row">
                <label>Card Text</label>
                <input
                  type="text"
                  value={oracleText}
                  onChange={(e) => setOracleText(e.target.value)}
                  placeholder='e.g. "draw a card", "flying"'
                  className="filter-text-input"
                />
              </div>

              {/* Set Code */}
              <div className="filter-row">
                <label>Set Code</label>
                <input
                  type="text"
                  value={setCode}
                  onChange={(e) => setSetCode(e.target.value)}
                  placeholder="e.g. MKM, ONE, MH2"
                  className="filter-text-input"
                  maxLength={6}
                />
              </div>
            </div>
          )}
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

          {searchQuery.length < 2 && !isLoading && !hasActiveFilters && (
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
              <div className="card-preview-wrapper">
                <img
                  src={getCardImageUrl(card, 'small')}
                  alt={card.name}
                  className="card-image"
                  loading="lazy"
                  onMouseEnter={(e) => handleCardMouseEnter(card, e)}
                  onMouseLeave={handleCardMouseLeave}
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

      {/* Fixed position popup that renders outside the scrollable area */}
      {hoveredCard && (
        <div
          className="card-preview-fixed"
          style={{
            top: hoveredCard.position.top,
            left: hoveredCard.position.left,
          }}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          <img
            src={getCardImageUrl(hoveredCard.card, 'normal')}
            alt={hoveredCard.card.name}
            className="preview-image"
          />
          <div className="preview-info">
            <div className="preview-price">
              ${hoveredCard.card.prices?.usd || '0.00'}
            </div>
            <a
              href={`https://scryfall.com/search?q=!"${encodeURIComponent(hoveredCard.card.name)}"`}
              target="_blank"
              rel="noopener noreferrer"
              className="preview-link"
              onClick={(e) => e.stopPropagation()}
            >
              View on Scryfall
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
