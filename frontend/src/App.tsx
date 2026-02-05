import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DeckProvider } from './contexts/DeckContext'
import Landing from './pages/Landing/Landing'
import Dashboard from './pages/Dashboard/Dashboard'
import DeckBuilder from './pages/DeckBuilder/DeckBuilder'
import DeckAnalysis from './pages/DeckAnalysis/DeckAnalysis'
import MyDecks from './pages/MyDecks/MyDecks'
import PublicDecks from './pages/PublicDecks/PublicDecks'
import Profile from './pages/Profile/Profile'
import Account from './pages/Account/Account'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Admin from './pages/Admin/Admin'
import './App.css'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Navigation component with auth awareness
function Navigation() {
  const { isAuthenticated, user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="navbar">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo">
        MagicAI
      </Link>

      <div className="nav-links">
        {isAuthenticated ? (
          <>
            <Link to="/deck-builder">Deck Builder</Link>
            <Link to="/my-decks">My Decks</Link>
            <Link to="/public-decks">Explore</Link>
            <div className="user-menu">
              <button className="user-menu-trigger">
                <span className="user-avatar">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="user-name">{user?.displayName}</span>
              </button>
              <div className="user-dropdown">
                <Link to="/profile" className="dropdown-item">
                  <span>👤</span> Profile
                </Link>
                <Link to="/account" className="dropdown-item">
                  <span>⚙️</span> Account
                </Link>
                <Link to="/account#subscription" className="dropdown-item">
                  <span>💎</span> Subscription
                </Link>
                <div className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item logout">
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/">Home</Link>
            <Link to="/login" className="nav-link-signin">Sign In</Link>
            <Link to="/signup" className="nav-link-signup">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}

// Main app content
function AppContent() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="app">
      <Navigation />

      <main>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
          />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deck-builder"
            element={
              <ProtectedRoute>
                <DeckBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <DeckAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-decks"
            element={
              <ProtectedRoute>
                <MyDecks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/public-decks"
            element={
              <ProtectedRoute>
                <PublicDecks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* Admin route - protected, admin check happens inside component */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to landing or dashboard */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />}
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2025 Deck & Dice Studios. All rights reserved.</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <DeckProvider>
        <AppContent />
      </DeckProvider>
    </AuthProvider>
  )
}

export default App
