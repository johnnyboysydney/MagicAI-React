import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Profile.css'

interface UserProfile {
  displayName: string
  email: string
  avatar: string | null
  bio: string
  joinDate: string
  stats: {
    decksCreated: number
    cardsScanned: number
    analysesRun: number
  }
  linkedAccounts: {
    google: boolean
    discord: boolean
  }
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Placeholder user data - will be connected to Firebase later
  const [profile, setProfile] = useState<UserProfile>({
    displayName: 'MagicPlayer123',
    email: 'player@example.com',
    avatar: null,
    bio: 'MTG enthusiast since 2015. Love brewing jank Commander decks!',
    joinDate: 'January 2025',
    stats: {
      decksCreated: 12,
      cardsScanned: 156,
      analysesRun: 24,
    },
    linkedAccounts: {
      google: true,
      discord: false,
    },
  })

  const [editForm, setEditForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
  })

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Save to Firebase
    await new Promise(resolve => setTimeout(resolve, 1000))
    setProfile(prev => ({
      ...prev,
      displayName: editForm.displayName,
      bio: editForm.bio,
    }))
    setIsEditing(false)
    setIsSaving(false)
  }

  const handleCancel = () => {
    setEditForm({
      displayName: profile.displayName,
      bio: profile.bio,
    })
    setIsEditing(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <h1>My Profile</h1>
        <Link to="/account" className="account-link">
          Account Settings
        </Link>
      </div>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card main-card">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(profile.displayName)}
                </div>
              )}
              {isEditing && (
                <button className="avatar-edit-btn" title="Change avatar">
                  📷
                </button>
              )}
            </div>
            <div className="profile-info">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="edit-input display-name-input"
                  placeholder="Display Name"
                />
              ) : (
                <h2 className="display-name">{profile.displayName}</h2>
              )}
              <span className="email">{profile.email}</span>
              <span className="join-date">Member since {profile.joinDate}</span>
            </div>
          </div>

          <div className="bio-section">
            <label className="section-label">Bio</label>
            {isEditing ? (
              <textarea
                value={editForm.bio}
                onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                className="edit-textarea"
                placeholder="Tell us about yourself..."
                rows={3}
              />
            ) : (
              <p className="bio-text">{profile.bio || 'No bio set'}</p>
            )}
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="profile-card stats-card">
          <h3>Activity Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">🎴</span>
              <div className="stat-details">
                <span className="stat-number">{profile.stats.decksCreated}</span>
                <span className="stat-label">Decks Created</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📷</span>
              <div className="stat-details">
                <span className="stat-number">{profile.stats.cardsScanned}</span>
                <span className="stat-label">Cards Scanned</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🤖</span>
              <div className="stat-details">
                <span className="stat-number">{profile.stats.analysesRun}</span>
                <span className="stat-label">AI Analyses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Accounts Card */}
        <div className="profile-card linked-card">
          <h3>Linked Accounts</h3>
          <div className="linked-accounts">
            <div className={`linked-account ${profile.linkedAccounts.google ? 'connected' : ''}`}>
              <div className="account-info">
                <span className="account-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </span>
                <span className="account-name">Google</span>
              </div>
              {profile.linkedAccounts.google ? (
                <span className="account-status connected">Connected</span>
              ) : (
                <button className="btn btn-small">Connect</button>
              )}
            </div>
            <div className={`linked-account ${profile.linkedAccounts.discord ? 'connected' : ''}`}>
              <div className="account-info">
                <span className="account-icon discord-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </span>
                <span className="account-name">Discord</span>
              </div>
              {profile.linkedAccounts.discord ? (
                <span className="account-status connected">Connected</span>
              ) : (
                <button className="btn btn-small">Connect</button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="profile-card quick-links-card">
          <h3>Quick Links</h3>
          <div className="quick-links">
            <Link to="/deck-builder" className="quick-link">
              <span className="link-icon">🎴</span>
              <span>My Decks</span>
            </Link>
            <Link to="/account" className="quick-link">
              <span className="link-icon">⚙️</span>
              <span>Account Settings</span>
            </Link>
            <Link to="/account#subscription" className="quick-link">
              <span className="link-icon">💎</span>
              <span>Subscription</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
