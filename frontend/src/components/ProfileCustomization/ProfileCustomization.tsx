/**
 * ProfileCustomization Component
 * Allows users to customize their profile with tier-based access
 */

import { useState, useCallback } from 'react'
import { useTier } from '../../hooks/useTier'
import { useAuth } from '../../contexts/AuthContext'
import {
  AVATARS,
  BACKGROUNDS,
  THEMES,
  getItemCost,
  isItemFreeForTier,
  canUploadCustomAvatar,
  CUSTOM_AVATAR_CREDIT_COST,
  type AvatarItem,
  type BackgroundItem,
  type ThemeItem,
  type UserProfileCustomization,
  DEFAULT_CUSTOMIZATION,
} from '../../config/profileCustomization'
import './ProfileCustomization.css'

interface ProfileCustomizationProps {
  currentCustomization?: UserProfileCustomization
  onSave: (customization: UserProfileCustomization) => Promise<void>
}

export function ProfileCustomization({
  currentCustomization = DEFAULT_CUSTOMIZATION,
  onSave,
}: ProfileCustomizationProps) {
  const { tier, credits } = useTier()
  const { user } = useAuth()

  const [selectedAvatar, setSelectedAvatar] = useState(currentCustomization.avatarId)
  const [selectedBackground, setSelectedBackground] = useState(currentCustomization.backgroundId)
  const [selectedTheme, setSelectedTheme] = useState(currentCustomization.themeId)
  const [purchasedItems, setPurchasedItems] = useState<string[]>(
    currentCustomization.purchasedItems || []
  )
  const [customAvatarUrl, setCustomAvatarUrl] = useState(currentCustomization.customAvatarUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'avatars' | 'backgrounds' | 'themes'>('avatars')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [itemToPurchase, setItemToPurchase] = useState<AvatarItem | BackgroundItem | ThemeItem | null>(null)

  // Check if user owns an item (free for tier or purchased)
  const ownsItem = useCallback(
    (item: AvatarItem | BackgroundItem | ThemeItem): boolean => {
      if (isItemFreeForTier(item, tier)) return true
      return purchasedItems.includes(item.id)
    },
    [tier, purchasedItems]
  )

  // Handle item selection
  const handleSelectItem = useCallback(
    (item: AvatarItem | BackgroundItem | ThemeItem, type: 'avatar' | 'background' | 'theme') => {
      if (!ownsItem(item)) {
        // Show purchase modal
        setItemToPurchase(item)
        setShowPurchaseModal(true)
        return
      }

      // Apply selection
      if (type === 'avatar') {
        setSelectedAvatar(item.id)
        setCustomAvatarUrl(undefined)
      } else if (type === 'background') {
        setSelectedBackground(item.id)
      } else {
        setSelectedTheme(item.id)
      }
    },
    [ownsItem]
  )

  // Handle purchase
  const handlePurchase = useCallback(async () => {
    if (!itemToPurchase) return

    const cost = getItemCost(itemToPurchase, tier)
    if (credits < cost) {
      alert('Not enough credits!')
      return
    }

    // TODO: Deduct credits via backend
    // For now, just add to purchased items
    setPurchasedItems((prev) => [...prev, itemToPurchase.id])
    setShowPurchaseModal(false)

    // Auto-select the purchased item
    if ('type' in itemToPurchase && (itemToPurchase as AvatarItem).type) {
      setSelectedAvatar(itemToPurchase.id)
    } else if ('gradient' in itemToPurchase) {
      setSelectedBackground(itemToPurchase.id)
    } else {
      setSelectedTheme(itemToPurchase.id)
    }

    setItemToPurchase(null)
  }, [itemToPurchase, tier, credits])

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave({
        avatarId: selectedAvatar,
        customAvatarUrl,
        backgroundId: selectedBackground,
        themeId: selectedTheme,
        purchasedItems,
      })
    } catch (error) {
      console.error('Failed to save customization:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [selectedAvatar, customAvatarUrl, selectedBackground, selectedTheme, purchasedItems, onSave])

  // Get current selections for preview
  const currentAvatar = AVATARS.find((a) => a.id === selectedAvatar)
  const currentBackground = BACKGROUNDS.find((b) => b.id === selectedBackground)
  const currentTheme = THEMES.find((t) => t.id === selectedTheme)

  // Render item card
  const renderItemCard = (
    item: AvatarItem | BackgroundItem | ThemeItem,
    type: 'avatar' | 'background' | 'theme',
    isSelected: boolean
  ) => {
    const owned = ownsItem(item)
    const cost = getItemCost(item, tier)
    const isFree = isItemFreeForTier(item, tier)

    return (
      <div
        key={item.id}
        className={`customization-item ${isSelected ? 'selected' : ''} ${!owned ? 'locked' : ''}`}
        onClick={() => handleSelectItem(item, type)}
      >
        <div
          className="item-preview"
          style={
            type === 'background' && (item as BackgroundItem).gradient
              ? { background: (item as BackgroundItem).gradient }
              : type === 'theme'
                ? { background: (item as ThemeItem).primaryColor }
                : undefined
          }
        >
          {type !== 'background' && type !== 'theme' && (
            <span className="item-emoji">{item.preview}</span>
          )}
          {type === 'theme' && <span className="item-emoji">{item.preview}</span>}
        </div>
        <div className="item-info">
          <span className="item-name">{item.name}</span>
          {!owned && (
            <span className="item-cost">
              {cost > 0 ? `${cost} credits` : 'Upgrade required'}
            </span>
          )}
          {isFree && <span className="item-badge free">FREE</span>}
        </div>
        {!owned && <div className="item-lock">🔒</div>}
        {isSelected && owned && <div className="item-check">✓</div>}
      </div>
    )
  }

  // Group items by category
  const groupByCategory = <T extends { category: string }>(items: T[]): Record<string, T[]> => {
    return items.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
      },
      {} as Record<string, T[]>
    )
  }

  const avatarsByCategory = groupByCategory(AVATARS)
  const backgroundsByCategory = groupByCategory(BACKGROUNDS)
  const themesByCategory = groupByCategory(THEMES)

  return (
    <div className="profile-customization">
      {/* Preview Section */}
      <div className="customization-preview">
        <div
          className="preview-card"
          style={{ background: currentBackground?.gradient || '#1a1a2e' }}
        >
          <div className="preview-avatar">
            {customAvatarUrl ? (
              <img src={customAvatarUrl} alt="Custom Avatar" />
            ) : (
              <span className="avatar-emoji">{currentAvatar?.preview || '⚪'}</span>
            )}
          </div>
          <div className="preview-name">{user?.displayName || 'Your Name'}</div>
          <div className="preview-tier" style={{ color: currentTheme?.primaryColor }}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)} Member
          </div>
        </div>
        <p className="preview-hint">Preview of your profile</p>
      </div>

      {/* Tab Navigation */}
      <div className="customization-tabs">
        <button
          className={`tab-btn ${activeTab === 'avatars' ? 'active' : ''}`}
          onClick={() => setActiveTab('avatars')}
        >
          Avatars
        </button>
        <button
          className={`tab-btn ${activeTab === 'backgrounds' ? 'active' : ''}`}
          onClick={() => setActiveTab('backgrounds')}
        >
          Backgrounds
        </button>
        <button
          className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
          onClick={() => setActiveTab('themes')}
        >
          Themes
        </button>
      </div>

      {/* Content Area */}
      <div className="customization-content">
        {/* Avatars Tab */}
        {activeTab === 'avatars' && (
          <div className="tab-content">
            {/* Custom Avatar Upload (Pro+) */}
            <div className="customization-section">
              <h4>Custom Avatar</h4>
              {canUploadCustomAvatar(tier) ? (
                <div className="custom-avatar-upload">
                  <input
                    type="file"
                    accept="image/*"
                    id="avatar-upload"
                    className="hidden-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setCustomAvatarUrl(event.target?.result as string)
                          setSelectedAvatar('')
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  <label htmlFor="avatar-upload" className="upload-btn">
                    Upload Custom Avatar
                  </label>
                  {customAvatarUrl && (
                    <button
                      className="clear-btn"
                      onClick={() => {
                        setCustomAvatarUrl(undefined)
                        setSelectedAvatar('avatar-plains')
                      }}
                    >
                      Clear Custom
                    </button>
                  )}
                </div>
              ) : (
                <div className="feature-locked">
                  <span className="lock-icon">🔒</span>
                  <span>Upgrade to Pro to upload custom avatars</span>
                  <span className="or-text">or pay {CUSTOM_AVATAR_CREDIT_COST} credits</span>
                </div>
              )}
            </div>

            {/* Premade Avatars */}
            {Object.entries(avatarsByCategory).map(([category, items]) => (
              <div key={category} className="customization-section">
                <h4>{category}</h4>
                <div className="items-grid">
                  {items.map((item) =>
                    renderItemCard(item, 'avatar', selectedAvatar === item.id)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Backgrounds Tab */}
        {activeTab === 'backgrounds' && (
          <div className="tab-content">
            {Object.entries(backgroundsByCategory).map(([category, items]) => (
              <div key={category} className="customization-section">
                <h4>{category}</h4>
                <div className="items-grid backgrounds-grid">
                  {items.map((item) =>
                    renderItemCard(item, 'background', selectedBackground === item.id)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Themes Tab */}
        {activeTab === 'themes' && (
          <div className="tab-content">
            {Object.entries(themesByCategory).map(([category, items]) => (
              <div key={category} className="customization-section">
                <h4>{category}</h4>
                <div className="items-grid">
                  {items.map((item) =>
                    renderItemCard(item, 'theme', selectedTheme === item.id)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credits Display */}
      <div className="credits-display">
        <span>Your Credits: {credits}</span>
      </div>

      {/* Save Button */}
      <div className="customization-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && itemToPurchase && (
        <div className="purchase-modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="purchase-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPurchaseModal(false)}>
              &times;
            </button>
            <div className="modal-icon">{itemToPurchase.preview}</div>
            <h3>Unlock {itemToPurchase.name}</h3>
            <p>Purchase this item to use in your profile.</p>
            <div className="purchase-cost">
              <span className="cost-label">Cost:</span>
              <span className="cost-value">{getItemCost(itemToPurchase, tier)} credits</span>
            </div>
            <div className="purchase-balance">
              <span>Your balance: {credits} credits</span>
            </div>
            {credits >= getItemCost(itemToPurchase, tier) ? (
              <button className="btn btn-primary" onClick={handlePurchase}>
                Purchase Now
              </button>
            ) : (
              <div className="not-enough">
                <p>Not enough credits</p>
                <a href="/account#subscription" className="btn btn-secondary">
                  Get More Credits
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileCustomization
