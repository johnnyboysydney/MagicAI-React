import { useState, useEffect, useCallback } from 'react'
import type { ScryfallCard } from '../types/card'

const SCRYFALL_API = 'https://api.scryfall.com'

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export interface SearchFilters {
  type?: string // creature, instant, sorcery, etc.
  colors?: string[] // W, U, B, R, G
  rarity?: string // common, uncommon, rare, mythic
  isLegendary?: boolean
  format?: string // standard, modern, legacy, etc.
  // Advanced filters
  cmcMin?: number
  cmcMax?: number
  powerMin?: number
  powerMax?: number
  toughnessMin?: number
  toughnessMax?: number
  oracleText?: string // Search within card text
  setCode?: string // Set/edition code (e.g. 'MKM')
}

interface SearchResult {
  cards: ScryfallCard[]
  totalCards: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

// Build Scryfall query from filters
function buildSearchQuery(textQuery: string, filters: SearchFilters): string {
  const parts: string[] = []

  // Add the text search
  if (textQuery) {
    parts.push(textQuery)
  }

  // Add type filter
  if (filters.type) {
    parts.push(`t:${filters.type}`)
  }

  // Add legendary filter
  if (filters.isLegendary) {
    parts.push('t:legendary')
  }

  // Add color filter (cards that are exactly these colors or fewer)
  if (filters.colors && filters.colors.length > 0) {
    // Use color identity for commander-friendly results
    const colorStr = filters.colors.join('').toLowerCase()
    parts.push(`c<=${colorStr}`)
  }

  // Add rarity filter
  if (filters.rarity) {
    parts.push(`r:${filters.rarity}`)
  }

  // Add format legality filter
  if (filters.format) {
    parts.push(`f:${filters.format}`)
  }

  // Advanced: CMC range
  if (filters.cmcMin !== undefined && filters.cmcMin > 0) {
    parts.push(`cmc>=${filters.cmcMin}`)
  }
  if (filters.cmcMax !== undefined && filters.cmcMax > 0) {
    parts.push(`cmc<=${filters.cmcMax}`)
  }

  // Advanced: Power range
  if (filters.powerMin !== undefined && filters.powerMin > 0) {
    parts.push(`pow>=${filters.powerMin}`)
  }
  if (filters.powerMax !== undefined && filters.powerMax > 0) {
    parts.push(`pow<=${filters.powerMax}`)
  }

  // Advanced: Toughness range
  if (filters.toughnessMin !== undefined && filters.toughnessMin > 0) {
    parts.push(`tou>=${filters.toughnessMin}`)
  }
  if (filters.toughnessMax !== undefined && filters.toughnessMax > 0) {
    parts.push(`tou<=${filters.toughnessMax}`)
  }

  // Advanced: Oracle text search
  if (filters.oracleText && filters.oracleText.trim()) {
    parts.push(`o:"${filters.oracleText.trim()}"`)
  }

  // Advanced: Set code
  if (filters.setCode && filters.setCode.trim()) {
    parts.push(`e:${filters.setCode.trim().toLowerCase()}`)
  }

  return parts.join(' ')
}

export function useCardSearch(query: string, filters: SearchFilters = {}, delay: number = 300): SearchResult {
  const [cards, setCards] = useState<ScryfallCard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce the search query
  const debouncedQuery = useDebounce(query, delay)
  // Also debounce filters by serializing them
  const filtersKey = JSON.stringify(filters)
  const debouncedFiltersKey = useDebounce(filtersKey, delay)

  useEffect(() => {
    // Parse the debounced filters
    const currentFilters: SearchFilters = JSON.parse(debouncedFiltersKey || '{}')

    // Check if we have enough to search (either text or filters)
    const hasFilters = currentFilters.type || currentFilters.colors?.length ||
                       currentFilters.rarity || currentFilters.isLegendary || currentFilters.format ||
                       (currentFilters.cmcMin && currentFilters.cmcMin > 0) ||
                       (currentFilters.cmcMax && currentFilters.cmcMax > 0) ||
                       (currentFilters.powerMin && currentFilters.powerMin > 0) ||
                       (currentFilters.powerMax && currentFilters.powerMax > 0) ||
                       (currentFilters.toughnessMin && currentFilters.toughnessMin > 0) ||
                       (currentFilters.toughnessMax && currentFilters.toughnessMax > 0) ||
                       currentFilters.oracleText?.trim() || currentFilters.setCode?.trim()
    const hasText = debouncedQuery && debouncedQuery.length >= 2

    if (!hasText && !hasFilters) {
      setCards([])
      setTotalCards(0)
      setHasMore(false)
      setError(null)
      return
    }

    const abortController = new AbortController()

    async function searchCards() {
      setIsLoading(true)
      setError(null)

      try {
        // Build the full Scryfall query with filters
        const fullQuery = buildSearchQuery(debouncedQuery || '', currentFilters)
        const encodedQuery = encodeURIComponent(fullQuery)
        const url = `${SCRYFALL_API}/cards/search?q=${encodedQuery}&order=name&unique=cards`

        const response = await fetch(url, {
          signal: abortController.signal,
          headers: {
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            // No cards found - not an error
            setCards([])
            setTotalCards(0)
            setHasMore(false)
            return
          }
          throw new Error(`Search failed: ${response.status}`)
        }

        const data = await response.json()

        setCards(data.data || [])
        setTotalCards(data.total_cards || 0)
        setHasMore(data.has_more || false)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return
        }
        setError(err instanceof Error ? err.message : 'Search failed')
        setCards([])
      } finally {
        setIsLoading(false)
      }
    }

    searchCards()

    // Cleanup: abort the request if query changes before completion
    return () => {
      abortController.abort()
    }
  }, [debouncedQuery, debouncedFiltersKey])

  return { cards, totalCards, hasMore, isLoading, error }
}

// Hook for fetching a single card by exact name
export function useCardByName() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCard = useCallback(async (name: string): Promise<ScryfallCard | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const encodedName = encodeURIComponent(name)
      const url = `${SCRYFALL_API}/cards/named?fuzzy=${encodedName}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Card not found: ${name}`)
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch card')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchCard, isLoading, error }
}

// Hook for autocomplete suggestions (faster, returns just card names)
export function useAutocomplete(query: string, delay: number = 150) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedQuery = useDebounce(query, delay)

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([])
      return
    }

    const abortController = new AbortController()

    async function fetchSuggestions() {
      setIsLoading(true)

      try {
        const encodedQuery = encodeURIComponent(debouncedQuery)
        const url = `${SCRYFALL_API}/cards/autocomplete?q=${encodedQuery}`

        const response = await fetch(url, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          setSuggestions([])
          return
        }

        const data = await response.json()
        setSuggestions(data.data || [])
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()

    return () => {
      abortController.abort()
    }
  }, [debouncedQuery])

  return { suggestions, isLoading }
}
