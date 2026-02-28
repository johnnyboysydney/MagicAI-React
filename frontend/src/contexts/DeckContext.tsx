import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { DeckCard } from '../types/card'
import { useAuth } from './AuthContext'
import {
  createDeck as createDeckService,
  getUserDecks as getUserDecksService,
  updateDeck as updateDeckService,
  deleteDeck as deleteDeckService,
  firestoreDeckToAppDeck,
} from '../services/deckService'

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
  likeCount?: number
  viewCount?: number
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
  editingDeckId: string | null
  description?: string
  tags?: string[]
  isPublic?: boolean
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
  isLoadingDecks: boolean
  saveDeck: (deck: {
    name: string
    format: string
    cards: Map<string, DeckCard>
    commander: DeckCard | null
    isPublic?: boolean
    description?: string
    tags?: string[]
  }) => Promise<string>
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  refreshDecks: () => Promise<void>

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

    // Mana curve (cap at 7+) - exclude lands
    if (card.cardType !== 'land') {
      const cmc = Math.min(Math.floor(card.cmc), 7)
      manaCurve[cmc] = (manaCurve[cmc] || 0) + card.quantity
    }

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

const DEFAULT_BUILDER_STATE: DeckBuilderState = {
  deckName: 'Untitled Deck',
  selectedFormat: 'standard',
  deckCards: new Map(),
  commander: null,
  editingDeckId: null,
  description: '',
  tags: [],
  isPublic: false,
}

export function DeckProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null)
  const [currentDeckStats, setCurrentDeckStats] = useState<DeckStats | null>(null)
  const [userDecks, setUserDecks] = useState<Deck[]>([])
  const [isLoadingDecks, setIsLoadingDecks] = useState(false)
  const [builderState, setBuilderStateInternal] = useState<DeckBuilderState>(DEFAULT_BUILDER_STATE)

  // Load user decks when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserDecks()
    } else {
      setUserDecks([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.uid])

  const loadUserDecks = useCallback(async () => {
    if (!user) return

    setIsLoadingDecks(true)
    try {
      const firestoreDecks = await getUserDecksService(user.uid)
      const decks = firestoreDecks.map(firestoreDeckToAppDeck)
      setUserDecks(decks)
    } catch (error) {
      console.error('Error loading user decks:', error)
    } finally {
      setIsLoadingDecks(false)
    }
  }, [user])

  const refreshDecks = useCallback(async () => {
    await loadUserDecks()
  }, [loadUserDecks])

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
      authorId: user?.uid || 'anonymous',
      authorName: user?.displayName || 'Anonymous',
    }

    setCurrentDeck(deck)
    setCurrentDeckStats(stats)
  }, [user])

  const saveDeck = useCallback(async (deck: {
    name: string
    format: string
    cards: Map<string, DeckCard>
    commander: DeckCard | null
    isPublic?: boolean
    description?: string
    tags?: string[]
  }): Promise<string> => {
    if (!user) {
      throw new Error('Must be logged in to save decks')
    }

    const deckId = await createDeckService(user.uid, user.displayName, {
      name: deck.name,
      format: deck.format,
      cards: deck.cards,
      commander: deck.commander,
      isPublic: deck.isPublic,
      description: deck.description,
      tags: deck.tags,
    })

    // Refresh the decks list
    await loadUserDecks()

    return deckId
  }, [user, loadUserDecks])

  const updateDeck = useCallback(async (id: string, updates: Partial<Deck>) => {
    await updateDeckService(id, {
      name: updates.name,
      format: updates.format,
      cards: updates.cards,
      commander: updates.commander,
      isPublic: updates.isPublic,
      description: updates.description,
      tags: updates.tags,
    })

    // Update local state
    setUserDecks(prev =>
      prev.map(deck =>
        deck.id === id ? { ...deck, ...updates, updatedAt: new Date().toISOString() } : deck
      )
    )
  }, [])

  const deleteDeck = useCallback(async (id: string) => {
    await deleteDeckService(id)

    // Update local state
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
        isLoadingDecks,
        saveDeck,
        updateDeck,
        deleteDeck,
        refreshDecks,
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
