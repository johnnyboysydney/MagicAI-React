import { useState, useMemo } from 'react'
import type { DeckCard, ScryfallCard, CardType } from '../../types/card'
import { getCardImageUrl, isLegendaryCreature } from '../../types/card'
import './DeckView.css'

interface DeckViewProps {
  deckCards: Map<string, DeckCard>
  commander: DeckCard | null
  isCommanderFormat: boolean
  onRemoveCard: (cardName: string) => void
  onQuantityChange: (cardName: string, quantity: number) => void
  onRemoveCommander: () => void
  onCardDrop: (card: ScryfallCard) => void
  onCommanderDrop?: (card: ScryfallCard) => void
}

const TYPE_LABELS: Record<CardType, string> = {
  creature: 'Creatures',
  instant: 'Instants',
  sorcery: 'Sorceries',
  enchantment: 'Enchantments',
  artifact: 'Artifacts',
  planeswalker: 'Planeswalkers',
  land: 'Lands',
  other: 'Other',
}

const TYPE_ORDER: CardType[] = [
  'creature',
  'instant',
  'sorcery',
  'enchantment',
  'artifact',
  'planeswalker',
  'land',
  'other',
]

export default function DeckView({
  deckCards,
  commander,
  isCommanderFormat,
  onRemoveCard,
  onQuantityChange,
  onRemoveCommander,
  onCardDrop,
  onCommanderDrop,
}: DeckViewProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isCommanderDragOver, setIsCommanderDragOver] = useState(false)
  const [commanderDropError, setCommanderDropError] = useState<string | null>(null)

  // Group cards by type
  const groupedCards = useMemo(() => {
    const grouped: Record<CardType, DeckCard[]> = {
      creature: [],
      instant: [],
      sorcery: [],
      enchantment: [],
      artifact: [],
      planeswalker: [],
      land: [],
      other: [],
    }

    deckCards.forEach((card) => {
      grouped[card.cardType].push(card)
    })

    // Sort each group by name
    Object.keys(grouped).forEach((type) => {
      grouped[type as CardType].sort((a, b) => a.name.localeCompare(b.name))
    })

    return grouped
  }, [deckCards])

  // Total card count
  const totalCards = useMemo(() => {
    let count = 0
    deckCards.forEach((card) => {
      count += card.quantity
    })
    if (commander && isCommanderFormat) count += 1
    return count
  }, [deckCards, commander, isCommanderFormat])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    try {
      const cardData = e.dataTransfer.getData('application/json')
      if (cardData) {
        const card: ScryfallCard = JSON.parse(cardData)
        onCardDrop(card)
      }
    } catch (err) {
      console.error('Failed to parse dropped card:', err)
    }
  }

  // Commander zone drop handlers
  const handleCommanderDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setIsCommanderDragOver(true)
    setCommanderDropError(null)
  }

  const handleCommanderDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCommanderDragOver(false)
    setCommanderDropError(null)
  }

  const handleCommanderDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCommanderDragOver(false)

    try {
      const cardData = e.dataTransfer.getData('application/json')
      if (cardData && onCommanderDrop) {
        const card: ScryfallCard = JSON.parse(cardData)

        // Validate that the card can be a commander
        if (isLegendaryCreature(card)) {
          setCommanderDropError(null)
          onCommanderDrop(card)
        } else {
          setCommanderDropError('Only legendary creatures can be commanders!')
          // Clear error after 3 seconds
          setTimeout(() => setCommanderDropError(null), 3000)
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped card:', err)
    }
  }

  return (
    <div
      className={`deck-view ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="panel-header">
        <h3>📋 Deck List</h3>
        <span className="card-count">{totalCards} cards</span>
      </div>

      {isCommanderFormat && (
        <div
          className={`commander-slot ${isCommanderDragOver ? 'drag-over' : ''}`}
          onDragOver={handleCommanderDragOver}
          onDragLeave={handleCommanderDragLeave}
          onDrop={handleCommanderDrop}
        >
          <div className="commander-label">👑 Commander</div>
          {commanderDropError && (
            <div className="commander-error">
              ⚠️ {commanderDropError}
            </div>
          )}
          {commander ? (
            <div className="commander-card">
              <img
                src={getCardImageUrl(commander.scryfallData, 'small')}
                alt={commander.name}
                className="commander-image"
              />
              <div className="commander-info">
                <span className="commander-name">{commander.name}</span>
                <button
                  className="remove-commander-btn"
                  onClick={onRemoveCommander}
                  title="Remove commander"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <div className={`commander-placeholder ${isCommanderDragOver ? 'active' : ''}`}>
              <span>{isCommanderDragOver ? '📥 Drop legendary creature here' : 'Drag a legendary creature here'}</span>
            </div>
          )}
        </div>
      )}

      {isDragOver && (
        <div className="drop-indicator">
          <span>📥 Drop card to add to deck</span>
        </div>
      )}

      <div className="deck-content">
        {deckCards.size === 0 && !commander ? (
          <div className="empty-deck">
            <div className="empty-icon">🃏</div>
            <p>Your deck is empty</p>
            <p className="empty-hint">Search for cards and drag them here, or click + to add</p>
          </div>
        ) : (
          TYPE_ORDER.map((type) => {
            const cards = groupedCards[type]
            if (cards.length === 0) return null

            const groupTotal = cards.reduce((sum, c) => sum + c.quantity, 0)

            return (
              <div key={type} className="card-group">
                <div className="group-header">
                  <span>{TYPE_LABELS[type]}</span>
                  <span className="group-count">{groupTotal}</span>
                </div>
                <div className="group-cards">
                  {cards.map((card) => (
                    <div key={card.name} className="deck-card">
                      <span className="quantity">{card.quantity}x</span>
                      <span className="name" title={card.scryfallData.type_line}>
                        {card.name}
                      </span>
                      {card.scryfallData.mana_cost && (
                        <span className="mana-cost">{card.scryfallData.mana_cost}</span>
                      )}
                      <div className="quantity-controls">
                        <button
                          className="qty-btn"
                          onClick={() => onQuantityChange(card.name, card.quantity - 1)}
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <button
                          className="qty-btn"
                          onClick={() => onQuantityChange(card.name, card.quantity + 1)}
                          title="Increase quantity"
                        >
                          +
                        </button>
                        <button
                          className="remove-btn"
                          onClick={() => onRemoveCard(card.name)}
                          title="Remove from deck"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="panel-footer">
        <small>💡 Drag cards here or use + button</small>
      </div>
    </div>
  )
}
