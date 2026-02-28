import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { Deck } from '../../contexts/DeckContext'
import { getUserProfile } from '../../services/authService'
import { getPublicDecksByUser, firestoreDeckToAppDeck } from '../../services/deckService'
import './PublicProfile.css'

interface PublicUser {
  displayName: string
  bio: string
  photoURL: string | null
  customAvatarUrl?: string
  createdAt: string
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()

  const [profileUser, setProfileUser] = useState<PublicUser | null>(null)
  const [publicDecks, setPublicDecks] = useState<Deck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = currentUser?.uid === userId

  useEffect(() => {
    if (!userId) return

    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [profile, firestoreDecks] = await Promise.all([
          getUserProfile(userId),
          getPublicDecksByUser(userId),
        ])

        if (!profile) {
          setError('User not found')
          return
        }

        setProfileUser({
          displayName: profile.displayName,
          bio: profile.bio || '',
          photoURL: profile.photoURL,
          customAvatarUrl: profile.profileCustomization?.customAvatarUrl,
          createdAt: profile.createdAt instanceof Date
            ? profile.createdAt.toISOString()
            : String(profile.createdAt),
        })

        setPublicDecks(firestoreDecks.map(firestoreDeckToAppDeck))
      } catch (err) {
        console.error('Failed to load profile:', err)
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  const getFormatColor = (format: string): string => {
    const colors: Record<string, string> = {
      standard: '#22c55e',
      modern: '#3b82f6',
      commander: '#8b5cf6',
      pioneer: '#f59e0b',
      legacy: '#ef4444',
      vintage: '#ec4899',
      pauper: '#6b7280',
    }
    return colors[format] || '#6b7280'
  }

  const getDeckCardCount = (deck: Deck): number => {
    let count = 0
    deck.cards.forEach((card) => { count += card.quantity })
    if (deck.commander) count += 1
    return count
  }

  const totalLikes = publicDecks.reduce((sum, d) => sum + (d.likeCount || 0), 0)

  if (isLoading) {
    return (
      <div className="public-profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    )
  }

  if (error || !profileUser) {
    return (
      <div className="public-profile-page">
        <div className="profile-error">
          <h2>{error || 'User not found'}</h2>
          <Link to="/public-decks" className="back-link">Back to Explore</Link>
        </div>
      </div>
    )
  }

  const avatarUrl = profileUser.customAvatarUrl || profileUser.photoURL
  const memberSince = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="public-profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profileUser.displayName} />
          ) : (
            <span className="avatar-letter">
              {profileUser.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="profile-info">
          <h1>{profileUser.displayName}</h1>
          {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
          <div className="profile-meta">
            <span>Member since {memberSince}</span>
          </div>
          {isOwnProfile && (
            <Link to="/profile" className="edit-profile-link">Edit Profile</Link>
          )}
        </div>
        <div className="profile-stats-row">
          <div className="profile-stat">
            <span className="stat-value">{publicDecks.length}</span>
            <span className="stat-label">Public Decks</span>
          </div>
          <div className="profile-stat">
            <span className="stat-value">{totalLikes}</span>
            <span className="stat-label">Total Likes</span>
          </div>
        </div>
      </div>

      {/* Public Decks */}
      <div className="profile-decks-section">
        <h2>Public Decks</h2>
        {publicDecks.length > 0 ? (
          <div className="profile-decks-grid">
            {publicDecks.map((deck) => (
              <Link
                key={deck.id}
                to={`/deck/${deck.id}`}
                className="profile-deck-card"
              >
                <div className="profile-deck-header">
                  <h3>{deck.name}</h3>
                  <span
                    className="format-badge"
                    style={{
                      background: `${getFormatColor(deck.format)}20`,
                      color: getFormatColor(deck.format),
                    }}
                  >
                    {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
                  </span>
                </div>
                {deck.description && (
                  <p className="profile-deck-desc">{deck.description}</p>
                )}
                <div className="profile-deck-footer">
                  <span>{getDeckCardCount(deck)} cards</span>
                  <span>{deck.likeCount || 0} likes</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-public-decks">
            <p>No public decks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
