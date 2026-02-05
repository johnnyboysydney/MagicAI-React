import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  signUp,
  signIn,
  signInWithGoogle,
  logOut,
  getUserProfile,
  updateUserProfile,
  updateProfileCustomization as updateProfileCustomizationService,
  useCredits as useCreditsService,
  addCredits as addCreditsService,
  onAuthChange,
  type UserProfile,
} from '../services/authService'
import {
  type UserProfileCustomization,
  DEFAULT_CUSTOMIZATION,
} from '../config/profileCustomization'

// User type for the app
export interface User {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  subscription: 'free' | 'pro' | 'unlimited'
  credits: number
  profileCustomization: UserProfileCustomization
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
  updateProfileCustomization: (customization: UserProfileCustomization) => Promise<void>
  useCredits: (amount: number) => Promise<void>
  addCredits: (amount: number) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Convert UserProfile to User
function profileToUser(profile: UserProfile): User {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    subscription: profile.subscription,
    credits: profile.credits,
    profileCustomization: profile.profileCustomization || DEFAULT_CUSTOMIZATION,
    createdAt: profile.createdAt.toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) {
            setUser(profileToUser(profile))
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const refreshUser = useCallback(async () => {
    if (!user) return
    try {
      const profile = await getUserProfile(user.uid)
      if (profile) {
        setUser(profileToUser(profile))
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const profile = await signIn(email, password)
      setUser(profileToUser(profile))
    } catch (error) {
      setIsLoading(false)
      throw error
    }
    setIsLoading(false)
  }, [])

  const handleLoginWithGoogle = useCallback(async () => {
    setIsLoading(true)
    try {
      const profile = await signInWithGoogle()
      setUser(profileToUser(profile))
    } catch (error) {
      setIsLoading(false)
      throw error
    }
    setIsLoading(false)
  }, [])

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    setIsLoading(true)
    try {
      const profile = await signUp(email, password, displayName)
      setUser(profileToUser(profile))
    } catch (error) {
      setIsLoading(false)
      throw error
    }
    setIsLoading(false)
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await logOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
    setIsLoading(false)
  }, [])

  const handleUpdateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return
    try {
      await updateUserProfile(user.uid, {
        displayName: updates.displayName,
        photoURL: updates.photoURL,
      })
      setUser(prev => prev ? { ...prev, ...updates } : null)
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }, [user])

  const handleUseCredits = useCallback(async (amount: number) => {
    if (!user) return
    try {
      const newCredits = await useCreditsService(user.uid, amount)
      setUser(prev => prev ? { ...prev, credits: newCredits } : null)
    } catch (error) {
      console.error('Use credits error:', error)
      throw error
    }
  }, [user])

  const handleAddCredits = useCallback(async (amount: number) => {
    if (!user) return
    try {
      const newCredits = await addCreditsService(user.uid, amount)
      setUser(prev => prev ? { ...prev, credits: newCredits } : null)
    } catch (error) {
      console.error('Add credits error:', error)
      throw error
    }
  }, [user])

  const handleUpdateProfileCustomization = useCallback(async (customization: UserProfileCustomization) => {
    if (!user) return
    try {
      await updateProfileCustomizationService(user.uid, customization)
      setUser(prev => prev ? { ...prev, profileCustomization: customization } : null)
    } catch (error) {
      console.error('Update profile customization error:', error)
      throw error
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle: handleLoginWithGoogle,
        signup,
        logout,
        updateProfile: handleUpdateProfile,
        updateProfileCustomization: handleUpdateProfileCustomization,
        useCredits: handleUseCredits,
        addCredits: handleAddCredits,
        refreshUser,
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
