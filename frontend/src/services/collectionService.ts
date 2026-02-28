import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ScryfallCard } from '../types/card'
import { getCardType, getCardImageUrl, getCardPrice } from '../types/card'

// Card condition types
export type CardCondition =
  | 'mint'
  | 'near_mint'
  | 'lightly_played'
  | 'moderately_played'
  | 'heavily_played'
  | 'damaged'

// Condition multipliers for value estimation
export const CONDITION_MULTIPLIERS: Record<CardCondition, number> = {
  mint: 1.0,
  near_mint: 0.9,
  lightly_played: 0.75,
  moderately_played: 0.6,
  heavily_played: 0.4,
  damaged: 0.25,
}

export const CONDITION_LABELS: Record<CardCondition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  lightly_played: 'Lightly Played',
  moderately_played: 'Moderately Played',
  heavily_played: 'Heavily Played',
  damaged: 'Damaged',
}

// Collection card stored in Firestore
export interface CollectionCard {
  scryfallId: string
  name: string
  quantity: number
  foilQuantity: number
  condition: CardCondition
  setCode: string
  setName: string
  cardType: string
  cmc: number
  colors: string[]
  manaCost: string
  rarity: string
  price: number
  foilPrice: number
  imageUri: string
  typeLine: string
  oracleText: string
  colorIdentity: string[]
  legalities: Record<string, string>
  addedAt: Date
  updatedAt: Date
}

// Get collection ref for a user
function getCollectionRef(uid: string) {
  return collection(db, 'users', uid, 'collection')
}

// Convert ScryfallCard to CollectionCard data for Firestore
function scryfallToCollectionData(
  card: ScryfallCard,
  quantity: number,
  foilQuantity: number,
  condition: CardCondition
): Omit<CollectionCard, 'addedAt' | 'updatedAt'> {
  return {
    scryfallId: card.id,
    name: card.name,
    quantity,
    foilQuantity,
    condition,
    setCode: card.set,
    setName: card.set_name,
    cardType: getCardType(card),
    cmc: card.cmc || 0,
    colors: card.colors || [],
    manaCost: card.mana_cost || '',
    rarity: card.rarity,
    price: getCardPrice(card),
    foilPrice: parseFloat(card.prices?.usd_foil || '0'),
    imageUri: getCardImageUrl(card, 'normal'),
    typeLine: card.type_line || '',
    oracleText: card.oracle_text || '',
    colorIdentity: card.color_identity || [],
    legalities: card.legalities || {},
  }
}

// Add a card to the collection
export async function addCard(
  uid: string,
  card: ScryfallCard,
  quantity: number,
  foilQuantity: number,
  condition: CardCondition
): Promise<void> {
  const cardRef = doc(getCollectionRef(uid), card.id)
  const existing = await getDoc(cardRef)

  if (existing.exists()) {
    // Card already exists - add to quantities
    const data = existing.data()
    await setDoc(cardRef, {
      ...data,
      quantity: (data.quantity || 0) + quantity,
      foilQuantity: (data.foilQuantity || 0) + foilQuantity,
      condition,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } else {
    const cardData = scryfallToCollectionData(card, quantity, foilQuantity, condition)
    await setDoc(cardRef, {
      ...cardData,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

// Update card quantity and condition
export async function updateCard(
  uid: string,
  scryfallId: string,
  quantity: number,
  foilQuantity: number,
  condition: CardCondition
): Promise<void> {
  const cardRef = doc(getCollectionRef(uid), scryfallId)
  await setDoc(cardRef, {
    quantity,
    foilQuantity,
    condition,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// Remove a card from the collection
export async function removeCard(uid: string, scryfallId: string): Promise<void> {
  const cardRef = doc(getCollectionRef(uid), scryfallId)
  await deleteDoc(cardRef)
}

// Get the full collection
export async function getCollection(uid: string): Promise<CollectionCard[]> {
  const collRef = getCollectionRef(uid)
  const snapshot = await getDocs(collRef)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      scryfallId: doc.id,
      name: data.name || '',
      quantity: data.quantity || 0,
      foilQuantity: data.foilQuantity || 0,
      condition: data.condition || 'near_mint',
      setCode: data.setCode || '',
      setName: data.setName || '',
      cardType: data.cardType || 'other',
      cmc: data.cmc || 0,
      colors: data.colors || [],
      manaCost: data.manaCost || '',
      rarity: data.rarity || 'common',
      price: data.price || 0,
      foilPrice: data.foilPrice || 0,
      imageUri: data.imageUri || '',
      typeLine: data.typeLine || '',
      oracleText: data.oracleText || '',
      colorIdentity: data.colorIdentity || [],
      legalities: data.legalities || {},
      addedAt: data.addedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    }
  })
}

// Get collection count (lightweight)
export async function getCollectionCount(uid: string): Promise<number> {
  const collRef = getCollectionRef(uid)
  const snapshot = await getDocs(collRef)
  return snapshot.size
}

// Bulk add cards - takes parsed card lines like "4 Lightning Bolt"
export async function bulkAddCards(
  uid: string,
  cards: Array<{ name: string; quantity: number }>,
  condition: CardCondition = 'near_mint'
): Promise<{ added: number; failed: string[] }> {
  const SCRYFALL_API = 'https://api.scryfall.com'
  const failed: string[] = []
  let added = 0

  // Process in batches of 10 to respect Scryfall rate limits
  const batchSize = 10
  for (let i = 0; i < cards.length; i += batchSize) {
    const chunk = cards.slice(i, i + batchSize)
    const batch = writeBatch(db)
    let batchHasWrites = false

    for (const { name, quantity } of chunk) {
      try {
        // Look up card on Scryfall
        const encoded = encodeURIComponent(name)
        const response = await fetch(`${SCRYFALL_API}/cards/named?fuzzy=${encoded}`)

        if (!response.ok) {
          failed.push(name)
          continue
        }

        const scryfallCard: ScryfallCard = await response.json()
        const cardRef = doc(getCollectionRef(uid), scryfallCard.id)
        const existing = await getDoc(cardRef)

        if (existing.exists()) {
          const data = existing.data()
          batch.set(cardRef, {
            ...data,
            quantity: (data.quantity || 0) + quantity,
            updatedAt: serverTimestamp(),
          }, { merge: true })
        } else {
          const cardData = scryfallToCollectionData(scryfallCard, quantity, 0, condition)
          batch.set(cardRef, {
            ...cardData,
            addedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }

        batchHasWrites = true
        added += quantity
      } catch {
        failed.push(name)
      }

      // Scryfall rate limit: 50ms between requests
      await new Promise((r) => setTimeout(r, 80))
    }

    if (batchHasWrites) {
      await batch.commit()
    }
  }

  return { added, failed }
}

// Parse a bulk import string into card entries
export function parseBulkImport(text: string): Array<{ name: string; quantity: number }> {
  const lines = text.split('\n').filter((line) => line.trim())
  const cards: Array<{ name: string; quantity: number }> = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match patterns like "4 Lightning Bolt", "4x Lightning Bolt", "Lightning Bolt"
    const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/)
    if (match) {
      cards.push({
        quantity: parseInt(match[1], 10),
        name: match[2].trim(),
      })
    } else if (trimmed) {
      // No quantity specified, assume 1
      cards.push({ quantity: 1, name: trimmed })
    }
  }

  return cards
}
