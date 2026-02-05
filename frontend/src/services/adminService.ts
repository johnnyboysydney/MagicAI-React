/**
 * Admin Service - Client for Admin Cloud Functions
 */

import { auth } from '../config/firebase'

// Cloud Functions base URL - update after deployment
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-magicai-react-2025.cloudfunctions.net'

interface ApiResponse {
  success: boolean
  error?: string
  [key: string]: unknown
}

/**
 * Make an authenticated request to a Cloud Function
 */
async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Not authenticated')
  }

  const idToken = await user.getIdToken()

  const response = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  })

  const data = await response.json() as ApiResponse

  if (!data.success) {
    throw new Error(data.error || 'Unknown error')
  }

  return data as T
}

// ============ User Management ============

export interface AdminUser {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  subscription: 'free' | 'pro' | 'unlimited'
  credits: number
  createdAt: string
  updatedAt: string
  deckCount?: number
  auth?: {
    emailVerified: boolean
    disabled: boolean
    lastSignInTime: string
    creationTime: string
    providerData: Array<{ providerId: string; email: string }>
  }
}

export interface ListUsersResponse {
  success: boolean
  users: AdminUser[]
  totalCount: number
  hasMore: boolean
  nextCursor: string | null
}

export interface GetUserResponse {
  success: boolean
  user: AdminUser
}

export async function listUsers(
  limit = 20,
  startAfter?: string
): Promise<ListUsersResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (startAfter) params.set('startAfter', startAfter)

  return adminFetch<ListUsersResponse>(`adminListUsers?${params}`)
}

export async function getUser(uid: string): Promise<GetUserResponse> {
  return adminFetch<GetUserResponse>(`adminGetUser?uid=${uid}`)
}

export async function searchUsers(
  query: string,
  limit = 20
): Promise<{ success: boolean; users: AdminUser[]; totalResults: number }> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return adminFetch(`adminSearchUsers?${params}`)
}

export async function updateUser(
  uid: string,
  updates: {
    credits?: number
    subscription?: 'free' | 'pro' | 'unlimited'
    displayName?: string
  }
): Promise<{ success: boolean; message: string }> {
  return adminFetch(`adminUpdateUser`, {
    method: 'POST',
    body: JSON.stringify({ uid, updates }),
  })
}

// ============ Analytics ============

export interface PlatformStats {
  users: {
    total: number
    newLast7Days: number
    byTier: {
      free: number
      pro: number
      unlimited: number
    }
  }
  decks: {
    total: number
    public: number
    newLast7Days: number
    byFormat: Record<string, number>
  }
  credits: {
    totalInCirculation: number
  }
  generatedAt: string
}

export interface UsageTimeline {
  date: string
  users: number
  decks: number
}

export async function getStats(): Promise<{ success: boolean; stats: PlatformStats }> {
  return adminFetch(`adminGetStats`)
}

export async function getUsageStats(
  days = 30
): Promise<{ success: boolean; timeline: UsageTimeline[]; summary: { totalNewUsers: number; totalNewDecks: number; periodDays: number } }> {
  return adminFetch(`adminGetUsageStats?days=${days}`)
}

// ============ Audit Logs ============

export interface AuditLogEntry {
  id: string
  adminUid: string
  adminEmail: string
  action: string
  details: Record<string, unknown>
  ipAddress: string
  userAgent: string
  timestamp: string
}

export async function getAuditLogs(
  limit = 50,
  startAfter?: string,
  action?: string,
  adminUid?: string
): Promise<{ success: boolean; logs: AuditLogEntry[]; hasMore: boolean; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (startAfter) params.set('startAfter', startAfter)
  if (action) params.set('action', action)
  if (adminUid) params.set('adminUid', adminUid)

  return adminFetch(`adminGetAuditLogs?${params}`)
}

// ============ Admin Status Check ============

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface AdminInfo {
  uid: string
  email: string
  role: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'support'
  permissions: string[]
}

/**
 * Check if the current user is an admin
 */
export async function checkAdminStatus(): Promise<AdminInfo | null> {
  const user = auth.currentUser
  if (!user) return null

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid))
    if (!adminDoc.exists()) return null

    const data = adminDoc.data()
    return {
      uid: user.uid,
      email: user.email || '',
      role: data.role,
      permissions: data.permissions || [],
    }
  } catch (error) {
    console.error('Error checking admin status:', error)
    return null
  }
}

// ============ Admin Setup ============

/**
 * Initialize the owner as the first admin (one-time setup)
 */
export async function setupOwnerAdmin(): Promise<{ success: boolean; message: string; admin?: AdminInfo }> {
  return adminFetch(`adminSetupOwner`, {
    method: 'POST',
  })
}

/**
 * Get the owner email from environment
 */
export function getOwnerEmail(): string {
  return import.meta.env.VITE_OWNER_EMAIL || ''
}
