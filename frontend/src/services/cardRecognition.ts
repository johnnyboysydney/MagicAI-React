import Tesseract from 'tesseract.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScryfallCard } from '../types/card'

// Types
export interface RecognizedCard {
  name: string
  confidence: 'high' | 'medium' | 'low'
  method: 'ocr' | 'ai'
  scryfallCard?: ScryfallCard
  error?: string
}

export interface RecognitionResult {
  success: boolean
  cards: RecognizedCard[]
  errors: string[]
}

interface OCRResult {
  name: string
  confidence: number
}

const SCRYFALL_API = 'https://api.scryfall.com'

// OCR confidence threshold - below this, we fall back to AI
const OCR_CONFIDENCE_THRESHOLD = 70

// Initialize Gemini AI (lazy loaded)
let genAI: GoogleGenerativeAI | null = null

function getGeminiAI(): GoogleGenerativeAI | null {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey)
    }
  }
  return genAI
}

/**
 * Extract card name from image using Tesseract OCR
 * Focuses on the top portion of the card where the name is located
 */
export async function recognizeCardOCR(imageBase64: string): Promise<OCRResult | null> {
  try {
    // Tesseract works with base64 data URLs directly
    const result = await Tesseract.recognize(imageBase64, 'eng', {
      logger: () => {}, // Disable progress logging
    })

    if (!result.data.text) {
      return null
    }

    // Extract the first line (usually the card name) and clean it up
    const lines = result.data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2)

    if (lines.length === 0) {
      return null
    }

    // First non-empty line is usually the card name
    // Clean up common OCR artifacts
    const rawName = lines[0]
      .replace(/[^\w\s',\-]/g, '') // Remove special chars except common card name chars
      .replace(/\s+/g, ' ')
      .trim()

    if (rawName.length < 2) {
      return null
    }

    // Use the confidence from Tesseract (average of word confidences)
    // Type assertion needed as Tesseract.js types don't include words array
    const words = (result.data as { words?: Array<{ confidence: number }> }).words || []
    const avgConfidence = words.length > 0
      ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
      : 0

    return {
      name: rawName,
      confidence: avgConfidence,
    }
  } catch (error) {
    console.error('OCR recognition failed:', error)
    return null
  }
}

/**
 * Recognize card name using Gemini Vision AI
 * Used as fallback when OCR confidence is low
 */
export async function recognizeCardAI(imageBase64: string): Promise<string | null> {
  const ai = getGeminiAI()
  if (!ai) {
    console.warn('Gemini AI not configured (VITE_GOOGLE_API_KEY missing)')
    return null
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
      {
        text: 'This is a Magic: The Gathering card. Return ONLY the exact card name, nothing else. If you cannot read the card name, respond with just "UNCLEAR".',
      },
    ])

    const response = await result.response
    const text = response.text().trim()

    if (text === 'UNCLEAR' || text.length < 2) {
      return null
    }

    return text
  } catch (error) {
    console.error('AI recognition failed:', error)
    return null
  }
}

/**
 * Recognize multiple cards in one image using Gemini Vision AI
 */
export async function recognizeMultipleCardsAI(imageBase64: string): Promise<string[]> {
  const ai = getGeminiAI()
  if (!ai) {
    console.warn('Gemini AI not configured (VITE_GOOGLE_API_KEY missing)')
    return []
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
      {
        text: 'This image contains one or more Magic: The Gathering cards. List ONLY the card names, one per line. If a card is unclear, write "UNCLEAR" for that card. Do not include any other text or explanations.',
      },
    ])

    const response = await result.response
    const text = response.text().trim()

    // Parse the response into individual card names
    const cardNames = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 1 && line !== 'UNCLEAR')

    return cardNames
  } catch (error) {
    console.error('AI batch recognition failed:', error)
    return []
  }
}

/**
 * Look up a card by name on Scryfall using fuzzy matching
 */
export async function lookupCardOnScryfall(cardName: string): Promise<ScryfallCard | null> {
  try {
    const encodedName = encodeURIComponent(cardName)
    const response = await fetch(`${SCRYFALL_API}/cards/named?fuzzy=${encodedName}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null // Card not found
      }
      throw new Error(`Scryfall lookup failed: ${response.status}`)
    }

    const card = await response.json() as ScryfallCard
    return card
  } catch (error) {
    console.error('Scryfall lookup failed:', error)
    return null
  }
}

/**
 * Recognize a single card using hybrid OCR + AI approach
 * 1. Try OCR first
 * 2. If OCR confidence is high and Scryfall finds the card, use it
 * 3. Otherwise, fall back to AI recognition
 */
export async function recognizeSingleCard(imageBase64: string): Promise<RecognitionResult> {
  const errors: string[] = []

  // Step 1: Try OCR
  const ocrResult = await recognizeCardOCR(imageBase64)

  if (ocrResult && ocrResult.confidence >= OCR_CONFIDENCE_THRESHOLD) {
    // Step 2: Verify with Scryfall
    const scryfallCard = await lookupCardOnScryfall(ocrResult.name)

    if (scryfallCard) {
      // OCR succeeded and card found
      return {
        success: true,
        cards: [{
          name: scryfallCard.name,
          confidence: ocrResult.confidence >= 85 ? 'high' : 'medium',
          method: 'ocr',
          scryfallCard,
        }],
        errors: [],
      }
    }
  }

  // Step 3: Fall back to AI
  const aiName = await recognizeCardAI(imageBase64)

  if (aiName) {
    const scryfallCard = await lookupCardOnScryfall(aiName)

    if (scryfallCard) {
      return {
        success: true,
        cards: [{
          name: scryfallCard.name,
          confidence: 'medium',
          method: 'ai',
          scryfallCard,
        }],
        errors: [],
      }
    } else {
      errors.push(`Card "${aiName}" not found in database`)
    }
  }

  // If we got an OCR result but couldn't verify, include it as low confidence
  if (ocrResult) {
    return {
      success: false,
      cards: [{
        name: ocrResult.name,
        confidence: 'low',
        method: 'ocr',
        error: 'Could not verify card in database',
      }],
      errors: ['Could not identify card. Please try again or search manually.'],
    }
  }

  return {
    success: false,
    cards: [],
    errors: ['Could not identify card. Please try again with a clearer image.'],
  }
}

/**
 * Recognize multiple cards in one image
 * Uses AI for batch recognition since OCR would need to segment the image
 */
export async function recognizeMultipleCards(imageBase64: string): Promise<RecognitionResult> {
  const cards: RecognizedCard[] = []
  const errors: string[] = []

  // Use AI for batch recognition
  const cardNames = await recognizeMultipleCardsAI(imageBase64)

  if (cardNames.length === 0) {
    return {
      success: false,
      cards: [],
      errors: ['No cards detected in image. Please try again with a clearer image.'],
    }
  }

  // Look up each card on Scryfall
  for (const name of cardNames) {
    const scryfallCard = await lookupCardOnScryfall(name)

    if (scryfallCard) {
      cards.push({
        name: scryfallCard.name,
        confidence: 'medium',
        method: 'ai',
        scryfallCard,
      })
    } else {
      cards.push({
        name: name,
        confidence: 'low',
        method: 'ai',
        error: `Card "${name}" not found in database`,
      })
      errors.push(`Card "${name}" not found in database`)
    }

    // Small delay to avoid rate limiting Scryfall
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return {
    success: cards.some(c => c.scryfallCard !== undefined),
    cards,
    errors,
  }
}

/**
 * Check if AI recognition is available (API key configured)
 */
export function isAIAvailable(): boolean {
  return !!import.meta.env.VITE_GOOGLE_API_KEY
}
