import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

// Mock user type - will be replaced with Firebase user later
export interface User {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  subscription: 'free' | 'pro' | 'unlimited'
  credits: number
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  useCredits: (amount: number) => void
  addCredits: (amount: number) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Mock user for development
const MOCK_USER: User = {
  uid: 'mock-user-123',
  email: 'player@example.com',
  displayName: 'MagicPlayer123',
  photoURL: null,
  subscription: 'free',
  credits: 400,
  createdAt: '2025-01-15T00:00:00Z',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for persisted auth state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('magicai_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('magicai_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Persist user state
  useEffect(() => {
    if (user) {
      localStorage.setItem('magicai_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('magicai_user')
    }
  }, [user])

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock login - in real app, this would call Firebase
    setUser({
      ...MOCK_USER,
      email,
      displayName: email.split('@')[0],
    })
    setIsLoading(false)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock Google login
    setUser({
      ...MOCK_USER,
      email: 'google.user@gmail.com',
      displayName: 'Google User',
    })
    setIsLoading(false)
  }, [])

  const signup = useCallback(async (email: string, _password: string, displayName: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock signup
    setUser({
      ...MOCK_USER,
      uid: `user-${Date.now()}`,
      email,
      displayName,
      createdAt: new Date().toISOString(),
    })
    setIsLoading(false)
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(null)
    setIsLoading(false)
  }, [])

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }, [user])

  const useCredits = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return null
      const newCredits = Math.max(0, prev.credits - amount)
      return { ...prev, credits: newCredits }
    })
  }, [])

  const addCredits = useCallback((amount: number) => {
    setUser(prev => {
      if (!prev) return null
      return { ...prev, credits: prev.credits + amount }
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        signup,
        logout,
        updateProfile,
        useCredits,
        addCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
