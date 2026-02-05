// Scryfall API card type
export interface ScryfallCard {
  id: string
  name: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: string[]
  color_identity: string[]
  keywords?: string[]
  legalities: Record<string, string>
  set: string
  set_name: string
  rarity: string
  prices: {
    usd?: string
    usd_foil?: string
    eur?: string
  }
  image_uris?: {
    small: string
    normal: string
    large: string
    art_crop: string
  }
  // For double-faced cards
  card_faces?: Array<{
    name: string
    mana_cost?: string
    type_line: string
    oracle_text?: string
    image_uris?: {
      small: string
      normal: string
      large: string
      art_crop: string
    }
  }>
}

// Our internal deck card type
export interface DeckCard {
  id: string
  name: string
  quantity: number
  scryfallData: ScryfallCard
  cardType: CardType
  cmc: number
  colors: string[]
  manaCost: string
  price: number
}

export type CardType =
  | 'creature'
  | 'land'
  | 'instant'
  | 'sorcery'
  | 'enchantment'
  | 'artifact'
  | 'planeswalker'
  | 'other'

// Helper to get card image URL (handles double-faced cards)
export function getCardImageUrl(card: ScryfallCard, size: 'small' | 'normal' | 'large' = 'normal'): string {
  if (card.image_uris) {
    return card.image_uris[size]
  }
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size]
  }
  // Fallback placeholder
  return 'https://cards.scryfall.io/normal/front/0/0/00000000-0000-0000-0000-000000000000.jpg'
}

// Helper to determine card type from type line
export function getCardType(card: ScryfallCard): CardType {
  const typeLine = card.type_line?.toLowerCase() || ''

  if (typeLine.includes('creature')) return 'creature'
  if (typeLine.includes('land')) return 'land'
  if (typeLine.includes('instant')) return 'instant'
  if (typeLine.includes('sorcery')) return 'sorcery'
  if (typeLine.includes('enchantment')) return 'enchantment'
  if (typeLine.includes('artifact')) return 'artifact'
  if (typeLine.includes('planeswalker')) return 'planeswalker'

  return 'other'
}

// Helper to get price as number
export function getCardPrice(card: ScryfallCard): number {
  return parseFloat(card.prices?.usd || '0')
}

// Convert Scryfall card to our DeckCard format
export function scryfallToDeckCard(card: ScryfallCard, quantity: number = 1): DeckCard {
  return {
    id: card.id,
    name: card.name,
    quantity,
    scryfallData: card,
    cardType: getCardType(card),
    cmc: card.cmc || 0,
    colors: card.colors || [],
    manaCost: card.mana_cost || '',
    price: getCardPrice(card),
  }
}

// Check if card can be a commander (legendary creature or has "can be your commander" text)
export function isLegendaryCreature(card: ScryfallCard): boolean {
  const typeLine = card.type_line?.toLowerCase() || ''
  const oracleText = card.oracle_text?.toLowerCase() || ''

  // Check for legendary creature
  if (typeLine.includes('legendary') && typeLine.includes('creature')) {
    return true
  }

  // Some cards like planeswalkers can be commanders (e.g., "can be your commander")
  if (oracleText.includes('can be your commander')) {
    return true
  }

  return false
}
