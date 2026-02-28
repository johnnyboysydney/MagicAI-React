import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  doc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { DeckCard } from '../types/card'

// Serialized card for version snapshots
export interface VersionCard {
  name: string
  quantity: number
  cardType: string
  cmc: number
  colors: string[]
  manaCost: string
  price: number
  scryfallId: string
  imageUri: string
}

export interface DeckVersion {
  id: string
  deckId: string
  versionNumber: number
  cards: VersionCard[]
  commander: VersionCard | null
  cardCount: number
  savedAt: string
}

const MAX_VERSIONS = 20

// Serialize a DeckCard to a lightweight version snapshot
function serializeForVersion(card: DeckCard): VersionCard {
  return {
    name: card.name,
    quantity: card.quantity,
    cardType: card.cardType,
    cmc: card.cmc,
    colors: card.colors,
    manaCost: card.manaCost,
    price: card.price,
    scryfallId: card.scryfallData?.id || card.id,
    imageUri: card.scryfallData?.image_uris?.normal || card.scryfallData?.image_uris?.small || '',
  }
}

// Save a version snapshot when a deck is updated
export async function saveVersion(
  deckId: string,
  cards: Map<string, DeckCard>,
  commander: DeckCard | null
): Promise<string> {
  const versionsRef = collection(db, 'decks', deckId, 'versions')

  // Get current version count
  const existing = await getDocs(query(versionsRef, orderBy('savedAt', 'desc')))
  const versionNumber = existing.size + 1

  // Serialize cards
  const serializedCards = Array.from(cards.values()).map(serializeForVersion)
  const serializedCommander = commander ? serializeForVersion(commander) : null

  // Calculate total card count
  let cardCount = serializedCards.reduce((sum, c) => sum + c.quantity, 0)
  if (serializedCommander) cardCount += 1

  const docRef = await addDoc(versionsRef, {
    deckId,
    versionNumber,
    cards: serializedCards,
    commander: serializedCommander,
    cardCount,
    savedAt: serverTimestamp(),
  })

  // Trim old versions if over limit
  if (existing.size >= MAX_VERSIONS) {
    const toDelete = existing.docs.slice(MAX_VERSIONS - 1)
    for (const oldDoc of toDelete) {
      await deleteDoc(doc(db, 'decks', deckId, 'versions', oldDoc.id))
    }
  }

  return docRef.id
}

// Get all versions for a deck (newest first)
export async function getVersions(deckId: string): Promise<DeckVersion[]> {
  const versionsRef = collection(db, 'decks', deckId, 'versions')
  const q = query(versionsRef, orderBy('savedAt', 'desc'), limit(MAX_VERSIONS))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((d) => {
    const data = d.data()
    const savedAt = data.savedAt as Timestamp | undefined
    return {
      id: d.id,
      deckId: data.deckId,
      versionNumber: data.versionNumber,
      cards: data.cards || [],
      commander: data.commander || null,
      cardCount: data.cardCount || 0,
      savedAt: savedAt ? savedAt.toDate().toISOString() : new Date().toISOString(),
    }
  })
}

// Convert version cards back to DeckCards (for restoring)
export function versionCardsToDeckCards(versionCards: VersionCard[]): Map<string, DeckCard> {
  const map = new Map<string, DeckCard>()
  for (const vc of versionCards) {
    map.set(vc.name, {
      id: vc.scryfallId,
      name: vc.name,
      quantity: vc.quantity,
      cardType: vc.cardType as DeckCard['cardType'],
      cmc: vc.cmc,
      colors: vc.colors,
      manaCost: vc.manaCost,
      price: vc.price,
      scryfallData: {
        id: vc.scryfallId,
        name: vc.name,
        mana_cost: vc.manaCost,
        cmc: vc.cmc,
        colors: vc.colors,
        type_line: vc.cardType,
        image_uris: { normal: vc.imageUri, small: vc.imageUri },
        prices: { usd: String(vc.price) },
      } as DeckCard['scryfallData'],
    })
  }
  return map
}

// Convert a single version card to DeckCard (for commander restore)
export function versionCardToDeckCard(vc: VersionCard): DeckCard {
  return {
    id: vc.scryfallId,
    name: vc.name,
    quantity: vc.quantity,
    cardType: vc.cardType as DeckCard['cardType'],
    cmc: vc.cmc,
    colors: vc.colors,
    manaCost: vc.manaCost,
    price: vc.price,
    scryfallData: {
      id: vc.scryfallId,
      name: vc.name,
      mana_cost: vc.manaCost,
      cmc: vc.cmc,
      colors: vc.colors,
      type_line: vc.cardType,
      image_uris: { normal: vc.imageUri, small: vc.imageUri },
      prices: { usd: String(vc.price) },
    } as DeckCard['scryfallData'],
  }
}
