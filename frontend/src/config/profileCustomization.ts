/**
 * Profile Customization Configuration
 * Defines avatars, backgrounds, and themes with tier-based access
 */

import { SubscriptionTier } from './tiers'

// Types
export interface CustomizationItem {
  id: string
  name: string
  preview: string // URL or emoji for preview
  category: string
  tierAccess: SubscriptionTier[] // Tiers that get it FREE
  creditCost: number // Cost for tiers that don't have free access (0 = locked until tier)
}

export interface AvatarItem extends CustomizationItem {
  type: 'premade' | 'custom'
}

export interface BackgroundItem extends CustomizationItem {
  gradient?: string // CSS gradient string
  image?: string // Image URL
}

export interface ThemeItem extends CustomizationItem {
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

// ============================================
// AVATARS
// ============================================

export const AVATARS: AvatarItem[] = [
  // FREE TIER - Basic Premade Avatars (6 options)
  {
    id: 'avatar-plains',
    name: 'Plains Walker',
    preview: '⚪',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },
  {
    id: 'avatar-island',
    name: 'Island Mage',
    preview: '🔵',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },
  {
    id: 'avatar-swamp',
    name: 'Swamp Dweller',
    preview: '⚫',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },
  {
    id: 'avatar-mountain',
    name: 'Mountain Fury',
    preview: '🔴',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },
  {
    id: 'avatar-forest',
    name: 'Forest Spirit',
    preview: '🟢',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },
  {
    id: 'avatar-colorless',
    name: 'Colorless Entity',
    preview: '💎',
    category: 'Basic Mana',
    type: 'premade',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
  },

  // PRO TIER - Creature Avatars (free for Pro+)
  {
    id: 'avatar-dragon',
    name: 'Dragon Lord',
    preview: '🐉',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },
  {
    id: 'avatar-angel',
    name: 'Angelic Guardian',
    preview: '👼',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },
  {
    id: 'avatar-demon',
    name: 'Demon Prince',
    preview: '😈',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },
  {
    id: 'avatar-sphinx',
    name: 'Sphinx Riddle',
    preview: '🦁',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },
  {
    id: 'avatar-hydra',
    name: 'Hydra Beast',
    preview: '🐍',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },
  {
    id: 'avatar-phoenix',
    name: 'Phoenix Rising',
    preview: '🔥',
    category: 'Creatures',
    type: 'premade',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
  },

  // PREMIUM TIER - Legendary Avatars
  {
    id: 'avatar-planeswalker',
    name: 'Planeswalker',
    preview: '✨',
    category: 'Legendary',
    type: 'premade',
    tierAccess: ['premium'],
    creditCost: 5,
  },
  {
    id: 'avatar-eldrazi',
    name: 'Eldrazi Titan',
    preview: '👁️',
    category: 'Legendary',
    type: 'premade',
    tierAccess: ['premium'],
    creditCost: 5,
  },
  {
    id: 'avatar-praetor',
    name: 'Phyrexian Praetor',
    preview: '🦾',
    category: 'Legendary',
    type: 'premade',
    tierAccess: ['premium'],
    creditCost: 5,
  },
  {
    id: 'avatar-sliver',
    name: 'Sliver Queen',
    preview: '🌈',
    category: 'Legendary',
    type: 'premade',
    tierAccess: ['premium'],
    creditCost: 5,
  },
  {
    id: 'avatar-god',
    name: 'God Eternal',
    preview: '⚡',
    category: 'Legendary',
    type: 'premade',
    tierAccess: ['premium'],
    creditCost: 5,
  },
]

// Custom avatar upload - Pro and Premium only
export const CUSTOM_AVATAR_ACCESS: SubscriptionTier[] = ['pro', 'premium']
export const CUSTOM_AVATAR_CREDIT_COST = 10 // For free tier to unlock

// ============================================
// BACKGROUNDS
// ============================================

export const BACKGROUNDS: BackgroundItem[] = [
  // FREE TIER - Default Background (1 option)
  {
    id: 'bg-default',
    name: 'Classic Dark',
    preview: '🌑',
    category: 'Basic',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },

  // PRO TIER - 3 Premium Backgrounds Free
  {
    id: 'bg-mana-swirl',
    name: 'Mana Swirl',
    preview: '🌀',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 5,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  },
  {
    id: 'bg-forest-depths',
    name: 'Forest Depths',
    preview: '🌲',
    category: 'Land',
    tierAccess: ['pro', 'premium'],
    creditCost: 5,
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  },
  {
    id: 'bg-volcanic',
    name: 'Volcanic Crater',
    preview: '🌋',
    category: 'Land',
    tierAccess: ['pro', 'premium'],
    creditCost: 5,
    gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  },

  // PREMIUM TIER - Exclusive Backgrounds
  {
    id: 'bg-phyrexia',
    name: 'Phyrexian Oil',
    preview: '🛢️',
    category: 'Planes',
    tierAccess: ['premium'],
    creditCost: 8,
    gradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a472a 50%, #2d1b4e 100%)',
  },
  {
    id: 'bg-ravnica',
    name: 'Ravnica Skyline',
    preview: '🏰',
    category: 'Planes',
    tierAccess: ['premium'],
    creditCost: 8,
    gradient: 'linear-gradient(135deg, #2c3e50 0%, #4a69bd 50%, #6a89cc 100%)',
  },
  {
    id: 'bg-innistrad',
    name: 'Innistrad Moon',
    preview: '🌙',
    category: 'Planes',
    tierAccess: ['premium'],
    creditCost: 8,
    gradient: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a3e 50%, #4a0e4e 100%)',
  },
  {
    id: 'bg-zendikar',
    name: 'Zendikar Rising',
    preview: '⛰️',
    category: 'Planes',
    tierAccess: ['premium'],
    creditCost: 8,
    gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 50%, #efefef 100%)',
  },
  {
    id: 'bg-amonkhet',
    name: 'Amonkhet Sands',
    preview: '🏛️',
    category: 'Planes',
    tierAccess: ['premium'],
    creditCost: 8,
    gradient: 'linear-gradient(135deg, #c9a227 0%, #8b6914 50%, #1a1a2e 100%)',
  },
  {
    id: 'bg-multiverse',
    name: 'Blind Eternities',
    preview: '🌌',
    category: 'Legendary',
    tierAccess: ['premium'],
    creditCost: 10,
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
]

// ============================================
// THEMES
// ============================================

export const THEMES: ThemeItem[] = [
  // FREE TIER - Default Theme
  {
    id: 'theme-default',
    name: 'Default Purple',
    preview: '💜',
    category: 'Basic',
    tierAccess: ['free', 'pro', 'premium'],
    creditCost: 0,
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',
    accentColor: '#a78bfa',
  },

  // PRO TIER - Basic Themes
  {
    id: 'theme-white',
    name: 'Plains Light',
    preview: '⚪',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
    primaryColor: '#fbbf24',
    secondaryColor: '#f59e0b',
    accentColor: '#fcd34d',
  },
  {
    id: 'theme-blue',
    name: 'Island Blue',
    preview: '🔵',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb',
    accentColor: '#60a5fa',
  },
  {
    id: 'theme-black',
    name: 'Swamp Shadow',
    preview: '⚫',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
    primaryColor: '#6b7280',
    secondaryColor: '#4b5563',
    accentColor: '#9ca3af',
  },
  {
    id: 'theme-red',
    name: 'Mountain Fire',
    preview: '🔴',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
    accentColor: '#f87171',
  },
  {
    id: 'theme-green',
    name: 'Forest Growth',
    preview: '🟢',
    category: 'Mana',
    tierAccess: ['pro', 'premium'],
    creditCost: 3,
    primaryColor: '#22c55e',
    secondaryColor: '#16a34a',
    accentColor: '#4ade80',
  },

  // PREMIUM TIER - Exclusive Themes
  {
    id: 'theme-gold',
    name: 'Legendary Gold',
    preview: '🏆',
    category: 'Premium',
    tierAccess: ['premium'],
    creditCost: 5,
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    accentColor: '#facc15',
  },
  {
    id: 'theme-rainbow',
    name: 'Five Color',
    preview: '🌈',
    category: 'Premium',
    tierAccess: ['premium'],
    creditCost: 5,
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    accentColor: '#06b6d4',
  },
  {
    id: 'theme-phyrexian',
    name: 'Phyrexian',
    preview: '🦾',
    category: 'Premium',
    tierAccess: ['premium'],
    creditCost: 5,
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    accentColor: '#34d399',
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a customization item is free for a given tier
 */
export function isItemFreeForTier(item: CustomizationItem, tier: SubscriptionTier): boolean {
  return item.tierAccess.includes(tier)
}

/**
 * Get the credit cost for an item based on tier
 * Returns 0 if free for tier, otherwise returns creditCost
 */
export function getItemCost(item: CustomizationItem, tier: SubscriptionTier): number {
  if (isItemFreeForTier(item, tier)) return 0
  return item.creditCost
}

/**
 * Check if user can access custom avatar upload
 */
export function canUploadCustomAvatar(tier: SubscriptionTier): boolean {
  return CUSTOM_AVATAR_ACCESS.includes(tier)
}

/**
 * Get all avatars available to a tier (free or purchasable)
 */
export function getAvatarsForTier(tier: SubscriptionTier): {
  free: AvatarItem[]
  purchasable: AvatarItem[]
} {
  const free = AVATARS.filter((a) => isItemFreeForTier(a, tier))
  const purchasable = AVATARS.filter((a) => !isItemFreeForTier(a, tier) && a.creditCost > 0)
  return { free, purchasable }
}

/**
 * Get all backgrounds available to a tier (free or purchasable)
 */
export function getBackgroundsForTier(tier: SubscriptionTier): {
  free: BackgroundItem[]
  purchasable: BackgroundItem[]
} {
  const free = BACKGROUNDS.filter((b) => isItemFreeForTier(b, tier))
  const purchasable = BACKGROUNDS.filter((b) => !isItemFreeForTier(b, tier) && b.creditCost > 0)
  return { free, purchasable }
}

/**
 * Get all themes available to a tier (free or purchasable)
 */
export function getThemesForTier(tier: SubscriptionTier): {
  free: ThemeItem[]
  purchasable: ThemeItem[]
} {
  const free = THEMES.filter((t) => isItemFreeForTier(t, tier))
  const purchasable = THEMES.filter((t) => !isItemFreeForTier(t, tier) && t.creditCost > 0)
  return { free, purchasable }
}

/**
 * Get summary of what each tier gets for free
 */
export function getTierCustomizationSummary(tier: SubscriptionTier): {
  freeAvatars: number
  freeBackgrounds: number
  freeThemes: number
  canUploadAvatar: boolean
  totalFreeItems: number
} {
  const avatars = getAvatarsForTier(tier)
  const backgrounds = getBackgroundsForTier(tier)
  const themes = getThemesForTier(tier)

  return {
    freeAvatars: avatars.free.length,
    freeBackgrounds: backgrounds.free.length,
    freeThemes: themes.free.length,
    canUploadAvatar: canUploadCustomAvatar(tier),
    totalFreeItems: avatars.free.length + backgrounds.free.length + themes.free.length,
  }
}

// User profile customization state
export interface UserProfileCustomization {
  avatarId: string
  customAvatarUrl?: string // For uploaded avatars
  backgroundId: string
  themeId: string
  purchasedItems: string[] // IDs of purchased items
}

export const DEFAULT_CUSTOMIZATION: UserProfileCustomization = {
  avatarId: 'avatar-plains',
  backgroundId: 'bg-default',
  themeId: 'theme-default',
  purchasedItems: [],
}
