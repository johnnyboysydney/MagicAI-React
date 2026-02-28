import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { ScryfallCard } from '../types/card'
import {
  type CollectionCard,
  type CardCondition,
  CONDITION_MULTIPLIERS,
  getCollection,
  addCard as addCardService,
  updateCard as updateCardService,
  removeCard as removeCardService,
  bulkAddCards as bulkAddCardsService,
  parseBulkImport,
} from '../services/collectionService'

export interface CollectionStats {
  totalCards: number
  uniqueCards: number
  totalValue: number
  adjustedValue: number
  foilCount: number
  colorDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  rarityDistribution: Record<string, number>
  conditionDistribution: Record<string, number>
  topValueCards: CollectionCard[]
}

export interface CollectionFilters {
  colors: string[]
  types: string[]
  rarity: string | null
  format: string | null
  minPrice: number | null
  maxPrice: number | null
}

export type SortOption =
  | 'name'
  | 'price-desc'
  | 'price-asc'
  | 'color'
  | 'type'
  | 'rarity'
  | 'quantity'
  | 'added'

const EMPTY_FILTERS: CollectionFilters = {
  colors: [],
  types: [],
  rarity: null,
  format: null,
  minPrice: null,
  maxPrice: null,
}

const RARITY_ORDER: Record<string, number> = {
  mythic: 0,
  rare: 1,
  uncommon: 2,
  common: 3,
}

const COLOR_ORDER: Record<string, number> = {
  W: 0,
  U: 1,
  B: 2,
  R: 3,
  G: 4,
}

function computeStats(cards: CollectionCard[]): CollectionStats {
  let totalCards = 0
  let totalValue = 0
  let adjustedValue = 0
  let foilCount = 0
  const colorDist: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  const typeDist: Record<string, number> = {}
  const rarityDist: Record<string, number> = {}
  const conditionDist: Record<string, number> = {}

  for (const card of cards) {
    const qty = card.quantity + card.foilQuantity
    totalCards += qty
    foilCount += card.foilQuantity

    const rawVal = card.quantity * card.price + card.foilQuantity * card.foilPrice
    totalValue += rawVal
    adjustedValue += rawVal * (CONDITION_MULTIPLIERS[card.condition] || 0.9)

    // Color distribution (count unique cards, not copies)
    if (card.colors.length === 0) {
      colorDist['C'] = (colorDist['C'] || 0) + 1
    } else {
      for (const c of card.colors) {
        colorDist[c] = (colorDist[c] || 0) + 1
      }
    }

    // Type distribution
    typeDist[card.cardType] = (typeDist[card.cardType] || 0) + 1

    // Rarity distribution
    rarityDist[card.rarity] = (rarityDist[card.rarity] || 0) + 1

    // Condition distribution
    conditionDist[card.condition] = (conditionDist[card.condition] || 0) + 1
  }

  // Top 5 most valuable cards
  const topValueCards = [...cards]
    .sort((a, b) => {
      const aVal = a.quantity * a.price + a.foilQuantity * a.foilPrice
      const bVal = b.quantity * b.price + b.foilQuantity * b.foilPrice
      return bVal - aVal
    })
    .slice(0, 5)

  return {
    totalCards,
    uniqueCards: cards.length,
    totalValue: Math.round(totalValue * 100) / 100,
    adjustedValue: Math.round(adjustedValue * 100) / 100,
    foilCount,
    colorDistribution: colorDist,
    typeDistribution: typeDist,
    rarityDistribution: rarityDist,
    conditionDistribution: conditionDist,
    topValueCards,
  }
}

function sortCards(cards: CollectionCard[], sortBy: SortOption): CollectionCard[] {
  const sorted = [...cards]
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'color':
      sorted.sort((a, b) => {
        const aColor = a.colors[0] || 'Z'
        const bColor = b.colors[0] || 'Z'
        return (COLOR_ORDER[aColor] ?? 99) - (COLOR_ORDER[bColor] ?? 99)
      })
      break
    case 'type':
      sorted.sort((a, b) => a.cardType.localeCompare(b.cardType))
      break
    case 'rarity':
      sorted.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99))
      break
    case 'quantity':
      sorted.sort((a, b) => (b.quantity + b.foilQuantity) - (a.quantity + a.foilQuantity))
      break
    case 'added':
      sorted.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
      break
  }
  return sorted
}

export function useCollection() {
  const { user } = useAuth()
  const [cards, setCards] = useState<CollectionCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState<SortOption>('name')

  // Load collection
  const loadCollection = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCollection(user.uid)
      setCards(data)
    } catch (err) {
      console.error('Failed to load collection:', err)
      setError('Failed to load collection')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadCollection()
  }, [loadCollection])

  // Filtered + sorted cards
  const filteredCards = useMemo(() => {
    let result = cards

    // Text search (name + oracle text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.oracleText.toLowerCase().includes(q) ||
          c.typeLine.toLowerCase().includes(q)
      )
    }

    // Color filter
    if (filters.colors.length > 0) {
      result = result.filter((c) =>
        filters.colors.some((color) => c.colorIdentity.includes(color))
      )
    }

    // Type filter
    if (filters.types.length > 0) {
      result = result.filter((c) => filters.types.includes(c.cardType))
    }

    // Rarity filter
    if (filters.rarity) {
      result = result.filter((c) => c.rarity === filters.rarity)
    }

    // Format legality filter
    if (filters.format) {
      result = result.filter((c) => c.legalities[filters.format!] === 'legal')
    }

    // Price range
    if (filters.minPrice !== null) {
      result = result.filter((c) => c.price >= filters.minPrice!)
    }
    if (filters.maxPrice !== null) {
      result = result.filter((c) => c.price <= filters.maxPrice!)
    }

    return sortCards(result, sortBy)
  }, [cards, searchQuery, filters, sortBy])

  // Stats computed from full (unfiltered) collection
  const stats = useMemo(() => computeStats(cards), [cards])

  // Actions
  const addCard = useCallback(
    async (card: ScryfallCard, qty: number, foilQty: number, condition: CardCondition) => {
      if (!user) return
      await addCardService(user.uid, card, qty, foilQty, condition)
      await loadCollection()
    },
    [user, loadCollection]
  )

  const updateCard = useCallback(
    async (scryfallId: string, qty: number, foilQty: number, condition: CardCondition) => {
      if (!user) return
      await updateCardService(user.uid, scryfallId, qty, foilQty, condition)
      await loadCollection()
    },
    [user, loadCollection]
  )

  const removeCard = useCallback(
    async (scryfallId: string) => {
      if (!user) return
      await removeCardService(user.uid, scryfallId)
      setCards((prev) => prev.filter((c) => c.scryfallId !== scryfallId))
    },
    [user]
  )

  const bulkImport = useCallback(
    async (text: string): Promise<{ added: number; failed: string[] }> => {
      if (!user) return { added: 0, failed: [] }
      const parsed = parseBulkImport(text)
      if (parsed.length === 0) return { added: 0, failed: [] }
      const result = await bulkAddCardsService(user.uid, parsed)
      await loadCollection()
      return result
    },
    [user, loadCollection]
  )

  return {
    cards,
    filteredCards,
    stats,
    isLoading,
    error,
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
    refreshCollection: loadCollection,
  }
}
