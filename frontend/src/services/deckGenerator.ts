import type { ScryfallCard } from '../types/card'

// Format-specific rules for deck building
export interface FormatRules {
  name: string
  minDeckSize: number
  maxDeckSize: number | null
  maxCopies: number // Max copies of non-basic-land cards
  hasCommander: boolean
  hasSideboard: boolean
  sideboardSize: number
  recommendedLands: number
  description: string
}

export const FORMAT_RULES: Record<string, FormatRules> = {
  standard: {
    name: 'Standard',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 24,
    description: 'Uses cards from recent sets (last 2-3 years)',
  },
  modern: {
    name: 'Modern',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 22,
    description: 'Uses cards from 8th Edition forward',
  },
  legacy: {
    name: 'Legacy',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 20,
    description: 'Almost all cards legal, powerful format',
  },
  vintage: {
    name: 'Vintage',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 18,
    description: 'Most powerful format, includes Power 9',
  },
  commander: {
    name: 'Commander',
    minDeckSize: 100,
    maxDeckSize: 100,
    maxCopies: 1, // Singleton format
    hasCommander: true,
    hasSideboard: false,
    sideboardSize: 0,
    recommendedLands: 37,
    description: '100-card singleton with a legendary commander',
  },
  pioneer: {
    name: 'Pioneer',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 24,
    description: 'Uses cards from Return to Ravnica forward',
  },
  pauper: {
    name: 'Pauper',
    minDeckSize: 60,
    maxDeckSize: null,
    maxCopies: 4,
    hasCommander: false,
    hasSideboard: true,
    sideboardSize: 15,
    recommendedLands: 22,
    description: 'Commons only format',
  },
}

// Deck archetypes for AI to consider
export const DECK_ARCHETYPES = [
  'Aggro',
  'Midrange',
  'Control',
  'Combo',
  'Tempo',
  'Ramp',
  'Tribal',
  'Tokens',
  'Aristocrats',
  'Reanimator',
  'Burn',
  'Mill',
] as const

export type DeckArchetype = (typeof DECK_ARCHETYPES)[number]

// Mana curve guidelines for different archetypes
export const MANA_CURVE_GUIDELINES: Record<DeckArchetype, { description: string; curve: string }> = {
  Aggro: {
    description: 'Low curve, lots of 1-2 drops',
    curve: '1-drop: 8-12, 2-drop: 12-16, 3-drop: 4-8, 4+ drop: 0-4',
  },
  Midrange: {
    description: 'Balanced curve with value creatures',
    curve: '1-drop: 2-4, 2-drop: 8-10, 3-drop: 8-10, 4-drop: 6-8, 5+ drop: 2-4',
  },
  Control: {
    description: 'Higher curve with few creatures',
    curve: '2-drop: 4-6, 3-drop: 6-10, 4-drop: 6-8, 5+ drop: 4-8, plus removal and counters',
  },
  Combo: {
    description: 'Focused on combo pieces and card draw',
    curve: 'Varies based on combo, prioritize consistency and protection',
  },
  Tempo: {
    description: 'Efficient creatures with disruption',
    curve: '1-drop: 4-8, 2-drop: 10-14, 3-drop: 4-8, plus instant-speed interaction',
  },
  Ramp: {
    description: 'Mana acceleration into big threats',
    curve: '1-2 drop ramp: 8-12, big finishers (6+ CMC): 6-10',
  },
  Tribal: {
    description: 'Synergistic creature-based',
    curve: 'Varies by tribe, focus on tribal synergies',
  },
  Tokens: {
    description: 'Token generators and anthems',
    curve: 'Token makers: 8-12, anthems/payoffs: 4-8',
  },
  Aristocrats: {
    description: 'Sacrifice synergies',
    curve: 'Sacrifice fodder: 8-12, sacrifice outlets: 4-6, payoffs: 4-6',
  },
  Reanimator: {
    description: 'Discard big creatures, reanimate them',
    curve: 'Big targets: 4-6, reanimation spells: 6-8, enablers: 8-12',
  },
  Burn: {
    description: 'Direct damage spells',
    curve: 'Burn spells (mostly 1-2 CMC): 24-28, creatures: 8-12',
  },
  Mill: {
    description: 'Deck opponent out',
    curve: 'Mill cards: 16-20, control elements: 12-16',
  },
}

// Generate prompt for AI deck generation
export interface DeckGenerationRequest {
  format: string
  archetype?: DeckArchetype
  colors?: string[] // W, U, B, R, G
  commander?: string // For commander format
  strategy?: string // User's custom strategy description
  budget?: 'budget' | 'moderate' | 'competitive' // Price range
}

export function generateDeckPrompt(request: DeckGenerationRequest): string {
  const rules = FORMAT_RULES[request.format] || FORMAT_RULES.standard
  const archetype = request.archetype || 'Midrange'
  const curveGuide = MANA_CURVE_GUIDELINES[archetype]

  let prompt = `Generate a competitive, legal ${rules.name} Magic: The Gathering deck.

FORMAT RULES:
- Deck size: ${rules.minDeckSize} cards (not fewer)
- Maximum copies per card: ${rules.maxCopies} (except basic lands)
- Include ${rules.recommendedLands} lands
${rules.hasCommander ? `- This is Commander/EDH: 1 legendary creature commander + 99 other cards = 100 total. Singleton (1 copy of each non-basic land). Commander must be a Legendary Creature.` : ''}
${rules.hasSideboard ? `- Include a ${rules.sideboardSize}-card sideboard` : ''}
- ALL cards must be legal in ${rules.name}. No banned cards (e.g. Mana Crypt, Nadu, Grief).

DECK REQUIREMENTS:
- Archetype: ${archetype}
- Mana curve guideline: ${curveGuide.curve}
- Strategy: ${curveGuide.description}
`

  if (request.colors && request.colors.length > 0) {
    const colorNames: Record<string, string> = {
      W: 'White',
      U: 'Blue',
      B: 'Black',
      R: 'Red',
      G: 'Green',
    }
    const colors = request.colors.map((c) => colorNames[c] || c).join('/')
    prompt += `- Colors: ${colors}\n`
  }

  if (request.commander) {
    prompt += `- Commander: ${request.commander}\n`
    prompt += `- All cards must be within the commander's color identity\n`
  }

  if (request.strategy) {
    prompt += `- User strategy notes: ${request.strategy}\n`
  }

  if (request.budget) {
    const budgetGuide = {
      budget: 'Under $50 total, use budget alternatives',
      moderate: '$50-200 range, balance power with cost',
      competitive: 'No budget restrictions, optimize for power',
    }
    prompt += `- Budget: ${budgetGuide[request.budget]}\n`
  }

  prompt += `
DECK BALANCE:
- Ensure proper mana base with ${rules.recommendedLands} lands (dual lands, fetch lands, utility lands as appropriate)
- Include card draw, removal, and synergistic cards for the strategy
${rules.hasCommander ? '- Include ramp: Sol Ring, signets, Cultivate, etc.' : ''}

OUTPUT FORMAT:
Output ONLY the card list, nothing else. No explanations, no descriptions, no strategy notes, no commentary.
Each card line: "QUANTITY CARDNAME" (e.g. "4 Lightning Bolt" or "1 Sol Ring")
${rules.hasCommander ? 'First line: "1 COMMANDER_NAME" marked under a "Commander" header.' : ''}
Group by type: Creatures, Instants, Sorceries, Enchantments, Artifacts, Planeswalkers, Lands.
${rules.hasSideboard ? 'Include a "Sideboard" section at the end.' : ''}
Include all ${rules.recommendedLands} lands in a "Lands" section. Output the complete ${rules.minDeckSize}-card deck.`

  return prompt
}

// Parse AI response into card list
export interface ParsedDeck {
  mainboard: Array<{ quantity: number; name: string }>
  sideboard: Array<{ quantity: number; name: string }>
  commander?: string
}

export function parseAIDeckResponse(response: string): ParsedDeck {
  const lines = response.split('\n')
  // Use Maps to merge duplicates (AI sometimes lists same card under multiple type headers)
  const mainboardMap = new Map<string, number>()
  const sideboardMap = new Map<string, number>()
  let commander: string | undefined
  let commanderConfirmed = false // Set true when commander found from a real card line

  let currentSection: 'main' | 'sideboard' | 'commander' = 'main'
  let pastCardList = false // Detect when we've left the card list

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect end of card list — stop parsing at explanation/commentary
    const lower = trimmed.toLowerCase().replace(/\*/g, '')
    if (
      lower.startsWith('explanation') ||
      lower.startsWith('notes') ||
      lower.startsWith('budget') ||
      lower.startsWith('gameplay') ||
      lower.startsWith('strategy') ||
      lower.startsWith('card breakdown') ||
      lower.startsWith('possible upgrades') ||
      lower.startsWith('mana curve')
    ) {
      pastCardList = true
    }
    if (pastCardList) continue

    // FIRST: try to parse as a card line (starts with a number)
    // This must come before section header detection so card names
    // containing words like "Island", "Badlands", "Commander's Sphere"
    // are not incorrectly treated as section headers
    const match = trimmed.match(/^(\d+)x?\s+(.+)$/i)
    if (match) {
      const quantity = parseInt(match[1], 10)
      const name = match[2].trim()

      if (currentSection === 'commander') {
        commander = name
        commanderConfirmed = true
        currentSection = 'main' // Reset to main after commander
      } else if (currentSection === 'sideboard') {
        // Merge duplicate sideboard entries
        sideboardMap.set(name, (sideboardMap.get(name) || 0) + quantity)
      } else {
        // Merge duplicate mainboard entries
        mainboardMap.set(name, (mainboardMap.get(name) || 0) + quantity)
      }
      continue
    }

    // SECOND: detect section headers (lines that are NOT card entries)
    if (lower.includes('sideboard')) {
      currentSection = 'sideboard'
    } else if (lower.includes('commander') && !commanderConfirmed) {
      // Only process commander headers if we haven't already found the commander
      // from a card line — prevents explanation text from overwriting it
      const inlineMatch = trimmed.match(/commander\s*[:\-–—]\s*(.+)/i)
      if (inlineMatch) {
        const name = inlineMatch[1].replace(/\*+/g, '').trim()
        if (name && name.length > 1) {
          commander = name
          currentSection = 'main'
        } else {
          currentSection = 'commander'
        }
      } else {
        currentSection = 'commander'
      }
    }
    // Other section headers (Creatures, Lands, etc.) don't change the section,
    // so we just skip them implicitly
  }

  // Convert Maps to arrays
  const mainboard = Array.from(mainboardMap.entries()).map(([name, quantity]) => ({ quantity, name }))
  const sideboard = Array.from(sideboardMap.entries()).map(([name, quantity]) => ({ quantity, name }))

  return { mainboard, sideboard, commander }
}

// Fetch cards from Scryfall by name
export async function fetchCardByName(cardName: string): Promise<ScryfallCard | null> {
  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    )
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Validate deck meets format rules
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateDeck(
  cards: Map<string, { quantity: number; card: ScryfallCard }>,
  format: string,
  commander?: ScryfallCard
): ValidationResult {
  const rules = FORMAT_RULES[format] || FORMAT_RULES.standard
  const errors: string[] = []
  const warnings: string[] = []

  // Calculate total cards
  let totalCards = 0
  cards.forEach(({ quantity }) => {
    totalCards += quantity
  })
  if (commander) totalCards += 1

  // Check deck size
  if (totalCards < rules.minDeckSize) {
    errors.push(`Deck has ${totalCards} cards, minimum is ${rules.minDeckSize}`)
  }
  if (rules.maxDeckSize && totalCards > rules.maxDeckSize) {
    errors.push(`Deck has ${totalCards} cards, maximum is ${rules.maxDeckSize}`)
  }

  // Check card copies
  cards.forEach(({ quantity, card }) => {
    const typeLine = card.type_line?.toLowerCase() || ''
    const isBasicLand = typeLine.includes('basic') && typeLine.includes('land')

    if (!isBasicLand && quantity > rules.maxCopies) {
      errors.push(`${card.name} has ${quantity} copies, maximum is ${rules.maxCopies}`)
    }
  })

  // Check format legality
  cards.forEach(({ card }) => {
    const legality = card.legalities[format]
    if (legality === 'not_legal' || legality === 'banned') {
      errors.push(`${card.name} is not legal in ${rules.name}`)
    } else if (legality === 'restricted' && format === 'vintage') {
      // Check for restricted cards (should only have 1)
      const cardEntry = cards.get(card.name)
      if (cardEntry && cardEntry.quantity > 1) {
        errors.push(`${card.name} is restricted in Vintage (max 1 copy)`)
      }
    }
  })

  // Check commander color identity
  if (commander && rules.hasCommander) {
    const commanderIdentity = new Set(commander.color_identity || [])
    cards.forEach(({ card }) => {
      const cardIdentity = card.color_identity || []
      for (const color of cardIdentity) {
        if (!commanderIdentity.has(color)) {
          errors.push(`${card.name} has ${color} in color identity, not in commander's identity`)
          break
        }
      }
    })
  }

  // Warnings for deck balance
  let landCount = 0
  cards.forEach(({ quantity, card }) => {
    if (card.type_line?.toLowerCase().includes('land')) {
      landCount += quantity
    }
  })

  if (landCount < rules.recommendedLands - 5) {
    warnings.push(`Only ${landCount} lands, recommended ${rules.recommendedLands}`)
  }
  if (landCount > rules.recommendedLands + 5) {
    warnings.push(`${landCount} lands is high, recommended ${rules.recommendedLands}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// Generate deck using Gemini AI
export async function generateDeckWithAI(
  request: DeckGenerationRequest,
  onProgress?: (message: string) => void
): Promise<ParsedDeck> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add VITE_GOOGLE_API_KEY to your environment.')
  }

  onProgress?.('Generating deck with AI...')

  const prompt = generateDeckPrompt(request)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 65536,
            thinkingConfig: {
              thinkingBudget: 1024,
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      throw new Error('No response from Gemini AI')
    }

    onProgress?.('Parsing AI response...')

    // Log raw AI output for debugging
    console.log('=== AI RAW OUTPUT ===')
    console.log(generatedText)
    console.log('=== END AI OUTPUT ===')

    const parsedDeck = parseAIDeckResponse(generatedText)

    // Log parsed results
    const totalCards = parsedDeck.mainboard.reduce((sum, c) => sum + c.quantity, 0)
    const sideboardTotal = parsedDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0)
    const rules = FORMAT_RULES[request.format] || FORMAT_RULES.standard

    console.log(`Parsed: ${totalCards} mainboard, ${sideboardTotal} sideboard, commander: ${parsedDeck.commander || 'none'}`)
    console.log(`Expected: ${rules.minDeckSize} mainboard cards`)

    if (totalCards < rules.minDeckSize * 0.8) {
      console.warn(`AI generated only ${totalCards} cards, expected at least ${rules.minDeckSize}`)
    }

    return parsedDeck
  } catch (error) {
    console.error('Gemini AI deck generation failed:', error)
    throw error
  }
}

// Fetch and validate all cards in a deck
export async function fetchDeckCards(
  parsedDeck: ParsedDeck,
  onProgress?: (message: string) => void
): Promise<{
  mainboard: Array<{ quantity: number; name: string; card: ScryfallCard | null }>
  sideboard: Array<{ quantity: number; name: string; card: ScryfallCard | null }>
  commander: ScryfallCard | null
  failedCards: string[]
}> {
  const failedCards: string[] = []

  const fetchCard = async (item: { quantity: number; name: string }) => {
    const card = await fetchCardByName(item.name)
    if (!card) {
      failedCards.push(item.name)
    }
    return { ...item, card }
  }

  // Fetch mainboard cards
  const mainboardResults = []
  for (let i = 0; i < parsedDeck.mainboard.length; i++) {
    const item = parsedDeck.mainboard[i]
    onProgress?.(`Fetching card ${i + 1}/${parsedDeck.mainboard.length}: ${item.name}`)
    mainboardResults.push(await fetchCard(item))
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 75))
  }

  // Fetch sideboard cards
  const sideboardResults = []
  for (const item of parsedDeck.sideboard) {
    sideboardResults.push(await fetchCard(item))
    await new Promise(resolve => setTimeout(resolve, 75))
  }

  // Fetch commander if present
  let commander: ScryfallCard | null = null
  if (parsedDeck.commander) {
    onProgress?.(`Fetching commander: ${parsedDeck.commander}`)
    commander = await fetchCardByName(parsedDeck.commander)
    if (!commander) {
      failedCards.push(parsedDeck.commander)
    }
  }

  return {
    mainboard: mainboardResults,
    sideboard: sideboardResults,
    commander,
    failedCards,
  }
}

// Sample deck templates for quick generation (fallback when AI not available)
export const SAMPLE_DECKS: Record<string, Record<string, string[]>> = {
  standard: {
    aggro: [
      '4 Monastery Swiftspear',
      '4 Soul-Scar Mage',
      '4 Heartfire Hero',
      '4 Slickshot Show-Off',
      '4 Lightning Strike',
      '4 Play with Fire',
      '4 Monstrous Rage',
      '4 Burst Lightning',
      '4 Light Up the Stage',
      '4 Kumano Faces Kakkazan',
      '18 Mountain',
      '2 Sokenzan, Crucible of Defiance',
    ],
  },
  commander: {
    template: [
      '1 Sol Ring',
      '1 Arcane Signet',
      '1 Command Tower',
      '1 Exotic Orchard',
      '1 Path to Exile',
      '1 Swords to Plowshares',
      '1 Counterspell',
      '1 Beast Within',
      '1 Chaos Warp',
      '1 Cultivate',
      '1 Kodama\'s Reach',
      '1 Harmonize',
      '1 Rishkar\'s Expertise',
      '1 Sun Titan',
      '1 Eternal Witness',
    ],
  },
}
