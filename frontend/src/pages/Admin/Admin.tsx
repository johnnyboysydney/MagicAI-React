/**
 * Admin Portal Page
 * Secure admin interface for user management and analytics
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  checkAdminStatus,
  listUsers,
  getUser,
  searchUsers,
  updateUser,
  getStats,
  getAuditLogs,
  setupOwnerAdmin,
  getOwnerEmail,
  type AdminInfo,
  type AdminUser,
  type PlatformStats,
  type AuditLogEntry,
} from '../../services/adminService'
import './Admin.css'

type TabType = 'users' | 'analytics' | 'audit'

export default function Admin() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  // Admin state
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('users')

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editCredits, setEditCredits] = useState<number>(0)
  const [editSubscription, setEditSubscription] = useState<string>('free')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Analytics state
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Setup state (for owner initialization)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  // Check admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      if (!isAuthenticated || !user) {
        setIsCheckingAdmin(false)
        return
      }

      try {
        const info = await checkAdminStatus()
        setAdminInfo(info)
      } catch (error) {
        console.error('Admin check failed:', error)
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [isAuthenticated, user])

  // Load users
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const response = await listUsers(50)
      setUsers(response.users)
      setTotalUsers(response.totalCount)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      loadUsers()
      return
    }

    setUsersLoading(true)
    try {
      const response = await searchUsers(searchQuery.trim())
      setUsers(response.users)
      setTotalUsers(response.totalResults)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setUsersLoading(false)
    }
  }, [searchQuery, loadUsers])

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await getStats()
      setStats(response.stats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const response = await getAuditLogs(50)
      setAuditLogs(response.logs)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Load data when tab changes
  useEffect(() => {
    if (!adminInfo) return

    switch (activeTab) {
      case 'users':
        loadUsers()
        break
      case 'analytics':
        loadStats()
        break
      case 'audit':
        loadAuditLogs()
        break
    }
  }, [activeTab, adminInfo, loadUsers, loadStats, loadAuditLogs])

  // View user details
  const handleViewUser = async (uid: string) => {
    try {
      const response = await getUser(uid)
      setSelectedUser(response.user)
      setEditCredits(response.user.credits)
      setEditSubscription(response.user.subscription)
    } catch (error) {
      console.error('Failed to get user:', error)
    }
  }

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setUpdateLoading(true)
    try {
      await updateUser(selectedUser.uid, {
        credits: editCredits,
        subscription: editSubscription as 'free' | 'pro' | 'unlimited',
      })

      // Refresh user data
      const response = await getUser(selectedUser.uid)
      setSelectedUser(response.user)

      // Refresh users list
      loadUsers()

      alert('User updated successfully')
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
    } finally {
      setUpdateLoading(false)
    }
  }

  // Loading state
  if (isCheckingAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Checking admin access...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-page">
        <div className="admin-unauthorized">
          <h1>Access Denied</h1>
          <p>Please sign in to access the admin portal.</p>
          <button onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
    )
  }

  // Not an admin - check if owner can set up
  const ownerEmail = getOwnerEmail()
  const isOwner = user?.email?.toLowerCase() === ownerEmail.toLowerCase()

  const handleSetupAdmin = async () => {
    setIsSettingUp(true)
    setSetupError(null)
    try {
      await setupOwnerAdmin()
      // Recheck admin status
      const info = await checkAdminStatus()
      setAdminInfo(info)
    } catch (error) {
      console.error('Setup failed:', error)
      setSetupError(error instanceof Error ? error.message : 'Setup failed')
    } finally {
      setIsSettingUp(false)
    }
  }

  if (!adminInfo) {
    return (
      <div className="admin-page">
        <div className="admin-unauthorized">
          <h1>Access Denied</h1>
          {isOwner ? (
            <>
              <p>Admin portal not initialized yet. Click below to set yourself as the owner admin.</p>
              {setupError && <p className="error-message">{setupError}</p>}
              <button onClick={handleSetupAdmin} disabled={isSettingUp}>
                {isSettingUp ? 'Setting up...' : 'Initialize Admin Portal'}
              </button>
            </>
          ) : (
            <>
              <p>You don't have permission to access the admin portal.</p>
              <button onClick={() => navigate('/')}>Return Home</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Portal</h1>
          <div className="admin-role-badge">{adminInfo.role.replace('_', ' ')}</div>
        </div>
        <p className="admin-email">Logged in as {adminInfo.email}</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-content">
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>User Management</h2>
              <span className="user-count">{totalUsers} total users</span>
            </div>

            {/* Search */}
            <div className="admin-search">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>Search</button>
              {searchQuery && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setSearchQuery('')
                    loadUsers()
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="loading-state">Loading users...</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Tier</th>
                      <th>Credits</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid}>
                        <td>{u.email}</td>
                        <td>{u.displayName}</td>
                        <td>
                          <span className={`tier-badge tier-${u.subscription}`}>
                            {u.subscription}
                          </span>
                        </td>
                        <td>{u.credits}</td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => handleViewUser(u.uid)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Detail Modal */}
          {selectedUser && (
            <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>User Details</h3>
                  <button className="close-btn" onClick={() => setSelectedUser(null)}>
                    &times;
                  </button>
                </div>

                <div className="modal-content">
                  <div className="user-detail-grid">
                    <div className="detail-row">
                      <label>UID:</label>
                      <span className="uid">{selectedUser.uid}</span>
                    </div>
                    <div className="detail-row">
                      <label>Email:</label>
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <label>Name:</label>
                      <span>{selectedUser.displayName}</span>
                    </div>
                    <div className="detail-row">
                      <label>Decks:</label>
                      <span>{selectedUser.deckCount ?? 0}</span>
                    </div>
                    <div className="detail-row">
                      <label>Joined:</label>
                      <span>
                        {selectedUser.createdAt
                          ? new Date(selectedUser.createdAt).toLocaleString()
                          : '-'}
                      </span>
                    </div>
                    {selectedUser.auth && (
                      <>
                        <div className="detail-row">
                          <label>Email Verified:</label>
                          <span>{selectedUser.auth.emailVerified ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="detail-row">
                          <label>Last Sign In:</label>
                          <span>{selectedUser.auth.lastSignInTime || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <label>Providers:</label>
                          <span>
                            {selectedUser.auth.providerData
                              .map((p) => p.providerId)
                              .join(', ')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <hr />

                  <h4>Edit User</h4>
                  <div className="edit-form">
                    <div className="form-row">
                      <label>Credits:</label>
                      <input
                        type="number"
                        min="0"
                        value={editCredits}
                        onChange={(e) => setEditCredits(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-row">
                      <label>Subscription:</label>
                      <select
                        value={editSubscription}
                        onChange={(e) => setEditSubscription(e.target.value)}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                    <button
                      className="save-btn"
                      onClick={handleUpdateUser}
                      disabled={updateLoading}
                    >
                      {updateLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="admin-content">
          {statsLoading ? (
            <div className="loading-state">Loading analytics...</div>
          ) : stats ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.users.total}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-change">+{stats.users.newLast7Days} this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.decks.total}</div>
                  <div className="stat-label">Total Decks</div>
                  <div className="stat-change">+{stats.decks.newLast7Days} this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.decks.public}</div>
                  <div className="stat-label">Public Decks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.credits.totalInCirculation}</div>
                  <div className="stat-label">Credits in Circulation</div>
                </div>
              </div>

              <div className="admin-section">
                <h3>Users by Tier</h3>
                <div className="tier-breakdown">
                  <div className="tier-row">
                    <span className="tier-badge tier-free">Free</span>
                    <div className="tier-bar">
                      <div
                        className="tier-bar-fill free"
                        style={{
                          width: `${(stats.users.byTier.free / stats.users.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="tier-count">{stats.users.byTier.free}</span>
                  </div>
                  <div className="tier-row">
                    <span className="tier-badge tier-pro">Pro</span>
                    <div className="tier-bar">
                      <div
                        className="tier-bar-fill pro"
                        style={{
                          width: `${(stats.users.byTier.pro / stats.users.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="tier-count">{stats.users.byTier.pro}</span>
                  </div>
                  <div className="tier-row">
                    <span className="tier-badge tier-unlimited">Unlimited</span>
                    <div className="tier-bar">
                      <div
                        className="tier-bar-fill unlimited"
                        style={{
                          width: `${(stats.users.byTier.unlimited / stats.users.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="tier-count">{stats.users.byTier.unlimited}</span>
                  </div>
                </div>
              </div>

              <div className="admin-section">
                <h3>Decks by Format</h3>
                <div className="format-grid">
                  {Object.entries(stats.decks.byFormat)
                    .sort(([, a], [, b]) => b - a)
                    .map(([format, count]) => (
                      <div key={format} className="format-card">
                        <div className="format-name">{format}</div>
                        <div className="format-count">{count}</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="stats-footer">
                <small>Generated at {new Date(stats.generatedAt).toLocaleString()}</small>
                <button onClick={loadStats}>Refresh</button>
              </div>
            </>
          ) : (
            <div className="error-state">Failed to load analytics</div>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="admin-content">
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>Audit Logs</h2>
              <button onClick={loadAuditLogs}>Refresh</button>
            </div>

            {auditLoading ? (
              <div className="loading-state">Loading audit logs...</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="timestamp">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : '-'}
                        </td>
                        <td>{log.adminEmail || log.adminUid}</td>
                        <td>
                          <code className="action-code">{log.action}</code>
                        </td>
                        <td className="details">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-state">
                          No audit logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
