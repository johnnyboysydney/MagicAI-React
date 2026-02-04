import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DeckCard } from '../types/card'

export interface Deck {
  id: string
  name: string
  format: string
  cards: Map<string, DeckCard>
  commander: DeckCard | null
  createdAt: string
  updatedAt: string
  isPublic: boolean
  authorId: string
  authorName: string
  description?: string
  tags?: string[]
}

export interface DeckStats {
  totalCards: number
  uniqueCards: number
  averageCMC: number
  totalPrice: number
  colorDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  manaCurve: Record<number, number>
  landCount: number
  nonlandCount: number
  creatureCount: number
}

// Deck builder state that persists across navigation
export interface DeckBuilderState {
  deckName: string
  selectedFormat: string
  deckCards: Map<string, DeckCard>
  commander: DeckCard | null
}

interface DeckContextType {
  // Current deck being edited/viewed
  currentDeck: Deck | null
  currentDeckStats: DeckStats | null
  setCurrentDeck: (deck: Deck | null) => void

  // Deck builder state (persists across navigation)
  builderState: DeckBuilderState
  setBuilderState: (state: DeckBuilderState) => void
  clearBuilderState: () => void

  // User's saved decks
  userDecks: Deck[]
  addDeck: (deck: Deck) => void
  updateDeck: (id: string, updates: Partial<Deck>) => void
  deleteDeck: (id: string) => void

  // Set deck for analysis (from deck builder)
  setDeckForAnalysis: (
    name: string,
    format: string,
    cards: Map<string, DeckCard>,
    commander: DeckCard | null
  ) => void
}

const DeckContext = createContext<DeckContextType | null>(null)

// Calculate stats from deck cards
function calculateDeckStats(
  cards: Map<string, DeckCard>,
  commander: DeckCard | null,
  isCommander: boolean
): DeckStats {
  let totalCards = 0
  let totalCMC = 0
  let totalPrice = 0
  const colorDistribution: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  const typeDistribution: Record<string, number> = {}
  const manaCurve: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
  let landCount = 0
  let creatureCount = 0

  cards.forEach((card) => {
    totalCards += card.quantity
    totalCMC += card.cmc * card.quantity
    totalPrice += card.price * card.quantity

    // Color distribution
    if (card.colors.length === 0) {
      colorDistribution['C'] += card.quantity
    } else {
      card.colors.forEach((color) => {
        colorDistribution[color] = (colorDistribution[color] || 0) + card.quantity
      })
    }

    // Type distribution
    const type = card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
    typeDistribution[type] = (typeDistribution[type] || 0) + card.quantity

    // Mana curve (cap at 7+)
    const cmc = Math.min(Math.floor(card.cmc), 7)
    manaCurve[cmc] = (manaCurve[cmc] || 0) + card.quantity

    // Counts
    if (card.cardType === 'land') landCount += card.quantity
    if (card.cardType === 'creature') creatureCount += card.quantity
  })

  // Add commander to counts if present
  if (commander && isCommander) {
    totalCards += 1
    if (commander.cardType === 'creature') creatureCount += 1
    const cmc = Math.min(Math.floor(commander.cmc), 7)
    manaCurve[cmc] = (manaCurve[cmc] || 0) + 1
  }

  const nonlandCount = totalCards - landCount
  const averageCMC = nonlandCount > 0 ? totalCMC / nonlandCount : 0

  return {
    totalCards,
    uniqueCards: cards.size + (commander ? 1 : 0),
    averageCMC: Math.round(averageCMC * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    colorDistribution,
    typeDistribution,
    manaCurve,
    landCount,
    nonlandCount,
    creatureCount,
  }
}

// Mock saved decks
const MOCK_USER_DECKS: Deck[] = [
  {
    id: 'deck-1',
    name: 'Mono Red Aggro',
    format: 'standard',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-02-01T15:30:00Z',
    isPublic: true,
    authorId: 'mock-user-123',
    authorName: 'MagicPlayer123',
    description: 'Fast and furious burn deck',
    tags: ['aggro', 'burn', 'budget'],
  },
  {
    id: 'deck-2',
    name: 'Azorius Control',
    format: 'pioneer',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-28T12:00:00Z',
    isPublic: false,
    authorId: 'mock-user-123',
    authorName: 'MagicPlayer123',
    description: 'Draw-go control with Teferi',
    tags: ['control', 'competitive'],
  },
  {
    id: 'deck-3',
    name: 'Krenko Goblin Tribal',
    format: 'commander',
    cards: new Map(),
    commander: null,
    createdAt: '2025-01-10T14:00:00Z',
    updatedAt: '2025-02-02T18:45:00Z',
    isPublic: true,
    authorId: 'mock-user-123',
    authorName: 'MagicPlayer123',
    description: 'Make goblins, swing face',
    tags: ['tribal', 'aggro', 'tokens'],
  },
]

const DEFAULT_BUILDER_STATE: DeckBuilderState = {
  deckName: 'Untitled Deck',
  selectedFormat: 'standard',
  deckCards: new Map(),
  commander: null,
}

export function DeckProvider({ children }: { children: ReactNode }) {
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null)
  const [currentDeckStats, setCurrentDeckStats] = useState<DeckStats | null>(null)
  const [userDecks, setUserDecks] = useState<Deck[]>(MOCK_USER_DECKS)
  const [builderState, setBuilderStateInternal] = useState<DeckBuilderState>(DEFAULT_BUILDER_STATE)

  const setBuilderState = useCallback((state: DeckBuilderState) => {
    setBuilderStateInternal(state)
  }, [])

  const clearBuilderState = useCallback(() => {
    setBuilderStateInternal(DEFAULT_BUILDER_STATE)
  }, [])

  const setDeckForAnalysis = useCallback((
    name: string,
    format: string,
    cards: Map<string, DeckCard>,
    commander: DeckCard | null
  ) => {
    const isCommander = format === 'commander'
    const stats = calculateDeckStats(cards, commander, isCommander)

    const deck: Deck = {
      id: `temp-${Date.now()}`,
      name,
      format,
      cards,
      commander,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
      authorId: 'current-user',
      authorName: 'You',
    }

    setCurrentDeck(deck)
    setCurrentDeckStats(stats)
  }, [])

  const addDeck = useCallback((deck: Deck) => {
    setUserDecks(prev => [deck, ...prev])
  }, [])

  const updateDeck = useCallback((id: string, updates: Partial<Deck>) => {
    setUserDecks(prev =>
      prev.map(deck =>
        deck.id === id ? { ...deck, ...updates, updatedAt: new Date().toISOString() } : deck
      )
    )
  }, [])

  const deleteDeck = useCallback((id: string) => {
    setUserDecks(prev => prev.filter(deck => deck.id !== id))
  }, [])

  return (
    <DeckContext.Provider
      value={{
        currentDeck,
        currentDeckStats,
        setCurrentDeck,
        builderState,
        setBuilderState,
        clearBuilderState,
        userDecks,
        addDeck,
        updateDeck,
        deleteDeck,
        setDeckForAnalysis,
      }}
    >
      {children}
    </DeckContext.Provider>
  )
}

export function useDeck() {
  const context = useContext(DeckContext)
  if (!context) {
    throw new Error('useDeck must be used within a DeckProvider')
  }
  return context
}
