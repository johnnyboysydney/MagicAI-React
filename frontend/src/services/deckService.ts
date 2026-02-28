import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { DeckCard } from '../types/card'

// Deck stored in Firestore
export interface FirestoreDeck {
  id: string
  name: string
  format: string
  authorId: string
  authorName: string
  isPublic: boolean
  description?: string
  tags?: string[]
  cards: SerializedDeckCard[]
  commander?: SerializedDeckCard | null
  likeCount: number
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

// Serialized card for Firestore (can't store complex objects directly)
interface SerializedDeckCard {
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

// Convert DeckCard to serialized format for Firestore
function serializeCard(card: DeckCard): SerializedDeckCard {
  return {
    name: card.name,
    quantity: card.quantity,
    cardType: card.cardType,
    cmc: card.cmc,
    colors: card.colors,
    manaCost: card.manaCost,
    price: card.price,
    scryfallId: card.scryfallData.id,
    imageUri: card.scryfallData.image_uris?.normal || card.scryfallData.image_uris?.small || '',
  }
}

// Convert serialized card back to DeckCard (partial - needs Scryfall data fetch for full)
function deserializeCard(card: SerializedDeckCard): DeckCard {
  return {
    id: card.scryfallId,
    name: card.name,
    quantity: card.quantity,
    cardType: card.cardType as DeckCard['cardType'],
    cmc: card.cmc,
    colors: card.colors,
    manaCost: card.manaCost,
    price: card.price,
    scryfallData: {
      id: card.scryfallId,
      name: card.name,
      mana_cost: card.manaCost,
      cmc: card.cmc,
      colors: card.colors,
      type_line: card.cardType,
      image_uris: { normal: card.imageUri, small: card.imageUri },
      prices: { usd: String(card.price) },
    } as DeckCard['scryfallData'],
  }
}

// Convert Firestore timestamp to Date
function timestampToDate(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date()
  if (timestamp instanceof Date) return timestamp
  return timestamp.toDate()
}

// Create a new deck
export async function createDeck(
  userId: string,
  userName: string,
  deck: {
    name: string
    format: string
    cards: Map<string, DeckCard>
    commander?: DeckCard | null
    isPublic?: boolean
    description?: string
    tags?: string[]
  }
): Promise<string> {
  const decksRef = collection(db, 'decks')

  const serializedCards = Array.from(deck.cards.values()).map(serializeCard)
  const serializedCommander = deck.commander ? serializeCard(deck.commander) : null

  const docRef = await addDoc(decksRef, {
    name: deck.name,
    format: deck.format,
    authorId: userId,
    authorName: userName,
    isPublic: deck.isPublic ?? false,
    description: deck.description || '',
    tags: deck.tags || [],
    cards: serializedCards,
    commander: serializedCommander,
    likeCount: 0,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

// Get a deck by ID
export async function getDeck(deckId: string): Promise<FirestoreDeck | null> {
  const deckRef = doc(db, 'decks', deckId)
  const deckSnap = await getDoc(deckRef)

  if (!deckSnap.exists()) return null

  const data = deckSnap.data()
  return {
    id: deckSnap.id,
    name: data.name,
    format: data.format,
    authorId: data.authorId,
    authorName: data.authorName,
    isPublic: data.isPublic,
    description: data.description,
    tags: data.tags,
    cards: data.cards || [],
    commander: data.commander,
    likeCount: data.likeCount || 0,
    viewCount: data.viewCount || 0,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  }
}

// Get all decks for a user
export async function getUserDecks(userId: string): Promise<FirestoreDeck[]> {
  const decksRef = collection(db, 'decks')
  const q = query(
    decksRef,
    where('authorId', '==', userId),
    orderBy('updatedAt', 'desc')
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      format: data.format,
      authorId: data.authorId,
      authorName: data.authorName,
      isPublic: data.isPublic,
      description: data.description,
      tags: data.tags,
      cards: data.cards || [],
      commander: data.commander,
      likeCount: data.likeCount || 0,
      viewCount: data.viewCount || 0,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    }
  })
}

// Get public decks (for discovery/browsing)
export async function getPublicDecks(limitCount = 20): Promise<FirestoreDeck[]> {
  const decksRef = collection(db, 'decks')
  const q = query(
    decksRef,
    where('isPublic', '==', true),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      format: data.format,
      authorId: data.authorId,
      authorName: data.authorName,
      isPublic: data.isPublic,
      description: data.description,
      tags: data.tags,
      cards: data.cards || [],
      commander: data.commander,
      likeCount: data.likeCount || 0,
      viewCount: data.viewCount || 0,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    }
  })
}

// Update a deck
export async function updateDeck(
  deckId: string,
  updates: Partial<{
    name: string
    format: string
    cards: Map<string, DeckCard>
    commander: DeckCard | null
    isPublic: boolean
    description: string
    tags: string[]
  }>
): Promise<void> {
  const deckRef = doc(db, 'decks', deckId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    updatedAt: serverTimestamp(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.format !== undefined) updateData.format = updates.format
  if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.tags !== undefined) updateData.tags = updates.tags

  if (updates.cards !== undefined) {
    updateData.cards = Array.from(updates.cards.values()).map(serializeCard)
  }

  if (updates.commander !== undefined) {
    updateData.commander = updates.commander ? serializeCard(updates.commander) : null
  }

  await updateDoc(deckRef, updateData)
}

// Delete a deck
export async function deleteDeck(deckId: string): Promise<void> {
  const deckRef = doc(db, 'decks', deckId)
  await deleteDoc(deckRef)
}

// Convert FirestoreDeck to app Deck format with Map
export function firestoreDeckToAppDeck(deck: FirestoreDeck): {
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
} {
  const cardsMap = new Map<string, DeckCard>()
  deck.cards.forEach((card) => {
    cardsMap.set(card.name, deserializeCard(card))
  })

  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    cards: cardsMap,
    commander: deck.commander ? deserializeCard(deck.commander) : null,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    isPublic: deck.isPublic,
    authorId: deck.authorId,
    authorName: deck.authorName,
    description: deck.description,
    tags: deck.tags,
    likeCount: deck.likeCount,
    viewCount: deck.viewCount,
  }
}
