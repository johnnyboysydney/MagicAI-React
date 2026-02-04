import { GoogleGenerativeAI } from '@google/generative-ai'
import type { DeckCard } from '../types/card'
import type { DeckStats } from '../contexts/DeckContext'

// Initialize Gemini AI
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export interface QuickVerdictResult {
  powerLevel: number // 1-10
  archetype: string
  verdict: string
  topStrengths: string[]
  topWeaknesses: string[]
}

export interface FullAnalysisResult extends QuickVerdictResult {
  detailedStrengths: string[]
  detailedWeaknesses: string[]
  winConditions: string[]
  suggestedCuts: Array<{ card: string; reason: string }>
  suggestedAdditions: Array<{ card: string; reason: string }>
  matchupAnalysis: {
    goodAgainst: string[]
    badAgainst: string[]
  }
  sideboardTips?: string[]
  overallStrategy: string
}

// Format deck for AI analysis
function formatDeckForAnalysis(
  name: string,
  format: string,
  cards: Map<string, DeckCard>,
  commander: DeckCard | null,
  stats: DeckStats
): string {
  let deckList = `Deck Name: ${name}\n`
  deckList += `Format: ${format}\n`

  if (commander) {
    deckList += `Commander: ${commander.name}\n`
  }

  deckList += `\nDeck Statistics:\n`
  deckList += `- Total Cards: ${stats.totalCards}\n`
  deckList += `- Average CMC: ${stats.averageCMC}\n`
  deckList += `- Land Count: ${stats.landCount}\n`
  deckList += `- Creature Count: ${stats.creatureCount}\n`
  deckList += `- Estimated Price: $${stats.totalPrice.toFixed(2)}\n`

  // Group cards by type
  const groupedCards: Record<string, Array<{ name: string; quantity: number; cmc: number }>> = {}

  cards.forEach((card) => {
    const type = card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
    if (!groupedCards[type]) {
      groupedCards[type] = []
    }
    groupedCards[type].push({
      name: card.name,
      quantity: card.quantity,
      cmc: card.cmc,
    })
  })

  deckList += `\nCard List:\n`

  // Sort types for consistent output
  const typeOrder = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land']
  const sortedTypes = Object.keys(groupedCards).sort((a, b) => {
    const aIndex = typeOrder.indexOf(a)
    const bIndex = typeOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  for (const type of sortedTypes) {
    deckList += `\n${type}s:\n`
    groupedCards[type]
      .sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name))
      .forEach((card) => {
        deckList += `${card.quantity}x ${card.name}\n`
      })
  }

  return deckList
}

// Quick Verdict - faster, less detailed analysis
export async function getQuickVerdict(
  name: string,
  format: string,
  cards: Map<string, DeckCard>,
  commander: DeckCard | null,
  stats: DeckStats
): Promise<QuickVerdictResult> {
  if (!genAI) {
    throw new Error('AI API key not configured. Please add VITE_GOOGLE_API_KEY to your environment.')
  }

  const deckList = formatDeckForAnalysis(name, format, cards, commander, stats)

  const prompt = `You are an expert Magic: The Gathering deck analyst. Analyze this ${format} deck and provide a quick verdict.

${deckList}

Provide your analysis in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "powerLevel": <number 1-10>,
  "archetype": "<archetype name like Aggro, Control, Midrange, Combo, etc>",
  "verdict": "<1-2 sentence overall verdict>",
  "topStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "topWeaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"]
}

Be honest and constructive. Rate power level based on:
- 1-3: Casual/beginner level
- 4-5: FNM competitive
- 6-7: Local tournament viable
- 8-9: High-level competitive
- 10: Meta-defining/top tier`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    try {
      // Clean up response - remove any markdown code blocks
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanedResponse) as QuickVerdictResult
    } catch {
      // Fallback parsing if JSON is malformed
      console.error('Failed to parse AI response:', response)
      return {
        powerLevel: 5,
        archetype: 'Unknown',
        verdict: 'Unable to parse AI response. Please try again.',
        topStrengths: ['Unable to analyze'],
        topWeaknesses: ['Unable to analyze'],
      }
    }
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

// Full Analysis - comprehensive deck review
export async function getFullAnalysis(
  name: string,
  format: string,
  cards: Map<string, DeckCard>,
  commander: DeckCard | null,
  stats: DeckStats
): Promise<FullAnalysisResult> {
  if (!genAI) {
    throw new Error('AI API key not configured. Please add VITE_GOOGLE_API_KEY to your environment.')
  }

  const deckList = formatDeckForAnalysis(name, format, cards, commander, stats)
  const isCommander = format === 'commander'

  const prompt = `You are an expert Magic: The Gathering deck analyst and competitive player. Provide a comprehensive analysis of this ${format} deck.

${deckList}

Analyze the deck thoroughly and provide your analysis in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "powerLevel": <number 1-10>,
  "archetype": "<primary archetype>",
  "verdict": "<2-3 sentence overall verdict>",
  "topStrengths": ["<key strength 1>", "<key strength 2>", "<key strength 3>"],
  "topWeaknesses": ["<key weakness 1>", "<key weakness 2>", "<key weakness 3>"],
  "detailedStrengths": ["<detailed strength explanation 1>", "<detailed strength 2>", "<detailed strength 3>", "<detailed strength 4>"],
  "detailedWeaknesses": ["<detailed weakness explanation 1>", "<detailed weakness 2>", "<detailed weakness 3>", "<detailed weakness 4>"],
  "winConditions": ["<primary win condition>", "<secondary win condition>"],
  "suggestedCuts": [
    {"card": "<card name to cut>", "reason": "<why to cut it>"},
    {"card": "<card name to cut>", "reason": "<why to cut it>"},
    {"card": "<card name to cut>", "reason": "<why to cut it>"}
  ],
  "suggestedAdditions": [
    {"card": "<card name to add>", "reason": "<why to add it>"},
    {"card": "<card name to add>", "reason": "<why to add it>"},
    {"card": "<card name to add>", "reason": "<why to add it>"},
    {"card": "<card name to add>", "reason": "<why to add it>"},
    {"card": "<card name to add>", "reason": "<why to add it>"}
  ],
  "matchupAnalysis": {
    "goodAgainst": ["<archetype this deck beats>", "<archetype 2>", "<archetype 3>"],
    "badAgainst": ["<archetype this deck struggles against>", "<archetype 2>", "<archetype 3>"]
  },
  ${!isCommander ? '"sideboardTips": ["<sideboard suggestion 1>", "<sideboard suggestion 2>", "<sideboard suggestion 3>"],' : ''}
  "overallStrategy": "<paragraph describing optimal play patterns and strategy>"
}

IMPORTANT GUIDELINES:
- Suggest cards that are LEGAL in ${format}
- Suggested additions should fit the deck's colors and strategy
- Be specific with card names (use exact Magic card names)
- Consider the mana curve when suggesting changes
- For power level: 1-3 casual, 4-5 FNM, 6-7 local competitive, 8-9 high competitive, 10 top tier
${isCommander ? '- Consider commander synergy and color identity restrictions' : '- Consider sideboard options for the metagame'}
- Be constructive but honest about weaknesses`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    try {
      // Clean up response - remove any markdown code blocks
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      return JSON.parse(cleanedResponse) as FullAnalysisResult
    } catch {
      // Fallback parsing if JSON is malformed
      console.error('Failed to parse AI response:', response)
      return {
        powerLevel: 5,
        archetype: 'Unknown',
        verdict: 'Unable to parse AI response. Please try again.',
        topStrengths: ['Unable to analyze'],
        topWeaknesses: ['Unable to analyze'],
        detailedStrengths: ['Unable to analyze'],
        detailedWeaknesses: ['Unable to analyze'],
        winConditions: ['Unable to determine'],
        suggestedCuts: [],
        suggestedAdditions: [],
        matchupAnalysis: {
          goodAgainst: [],
          badAgainst: [],
        },
        overallStrategy: 'Unable to determine strategy.',
      }
    }
  } catch (error) {
    throw new Error(parseApiError(error))
  }
}

// Check if AI is available
export function isAIAvailable(): boolean {
  return !!genAI
}

// Parse API error for user-friendly message
function parseApiError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Rate limit error
  if (errorMessage.includes('429') || errorMessage.includes('Resource exhausted')) {
    return 'AI rate limit reached. The free tier allows 60 requests per minute. Please wait a minute and try again, or consider upgrading to a paid API key.'
  }

  // API key error
  if (errorMessage.includes('401') || errorMessage.includes('API key')) {
    return 'Invalid or missing API key. Please check your VITE_GOOGLE_API_KEY configuration.'
  }

  // Network error
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return 'Network error. Please check your internet connection and try again.'
  }

  // Generic error
  return `AI Error: ${errorMessage}`
}
