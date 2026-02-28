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

FORMAT RULES (MUST follow strictly):
- Deck size: EXACTLY ${rules.minDeckSize} cards${rules.hasCommander ? ' (including commander)' : ''}
- Maximum copies per card: ${rules.maxCopies} (except basic lands)
- You MUST include exactly ${rules.recommendedLands} lands (mana-producing lands, not spells)
${rules.hasCommander ? `- COMMANDER: You MUST include a legendary creature as commander. The commander MUST have the type "Legendary Creature". Artifacts, enchantments, or other non-creature cards cannot be commanders unless they explicitly say they can be.
- Commander format is SINGLETON: every non-basic-land card can only have 1 copy
- The deck must have exactly 99 cards + 1 commander = 100 total` : ''}
${rules.hasSideboard ? `- Include a ${rules.sideboardSize}-card sideboard` : ''}

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
IMPORTANT LEGALITY RULES:
- ALL cards must be currently legal in ${rules.name} format
- Do NOT include any banned or restricted cards
- Do NOT include cards that have been recently banned (e.g., Mana Crypt, Nadu Winged Wisdom, Grief, etc.)
- If unsure about a card's legality, choose a safe alternative

DECK BALANCE GUIDELINES:
- LANDS ARE MANDATORY: Include ${rules.recommendedLands} lands. Use dual lands, fetch lands, and utility lands appropriate for the format and colors.${rules.hasCommander ? ' For a 5-color deck use Command Tower, City of Brass, Mana Confluence, shock lands, fetch lands, and triomes.' : ''}
- Include enough card draw/filtering (3-6 cards${rules.hasCommander ? ', 8-12 for Commander' : ''})
- Include removal spells appropriate to the format (4-8 cards${rules.hasCommander ? ', 8-12 for Commander' : ''})
- Include mana acceleration/ramp (${rules.hasCommander ? '10-15 sources including Sol Ring, signets, and land ramp spells' : '0-4 sources'})
- Ensure deck has a clear win condition
- Cards should synergize with the chosen strategy

OUTPUT FORMAT:
${rules.hasCommander ? `Start with "Commander" section header, then the commander card on its own line.
Then list the remaining 99 cards grouped by type.` : 'Return the deck as a list with each line in format: "QUANTITY CARDNAME"'}
Group cards by type (Creatures, Instants, Sorceries, Enchantments, Artifacts, Planeswalkers, Lands)
Include section headers. The "Lands" section MUST be present with ${rules.recommendedLands} land cards.
${rules.hasSideboard ? 'Include a "Sideboard" section at the end.' : ''}
Each card line format: "QUANTITY CARDNAME" (e.g. "1 Sol Ring" or "4 Lightning Bolt")

CRITICAL: The total card count MUST equal exactly ${rules.minDeckSize}. Count your cards before responding. Do not output fewer cards.`

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
  const mainboard: Array<{ quantity: number; name: string }> = []
  const sideboard: Array<{ quantity: number; name: string }> = []
  let commander: string | undefined

  let currentSection: 'main' | 'sideboard' | 'commander' = 'main'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

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
        currentSection = 'main' // Reset to main after commander
      } else if (currentSection === 'sideboard') {
        sideboard.push({ quantity, name })
      } else {
        mainboard.push({ quantity, name })
      }
      continue
    }

    // SECOND: detect section headers (lines that are NOT card entries)
    const lower = trimmed.toLowerCase()
    if (lower.includes('sideboard')) {
      currentSection = 'sideboard'
    } else if (lower.includes('commander')) {
      currentSection = 'commander'
    }
    // Other section headers (Creatures, Lands, etc.) don't change the section,
    // so we just skip them implicitly
  }

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
            temperature: 0.7,
            maxOutputTokens: 4096,
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

    const parsedDeck = parseAIDeckResponse(generatedText)

    // Validate we got enough cards
    const totalCards = parsedDeck.mainboard.reduce((sum, c) => sum + c.quantity, 0)
    const rules = FORMAT_RULES[request.format] || FORMAT_RULES.standard

    if (totalCards < rules.minDeckSize * 0.8) {
      console.warn(`AI generated only ${totalCards} cards, expected at least ${rules.minDeckSize}`)
      // Could retry here, but for now just proceed
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
