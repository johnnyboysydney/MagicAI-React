/**
 * Admin User Management Functions
 */

import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { verifyAdmin } from '../middleware/auth'
import { logAdminAction } from './audit'

const db = admin.firestore()

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  subscription: 'free' | 'pro' | 'unlimited'
  credits: number
  createdAt: admin.firestore.Timestamp
  updatedAt: admin.firestore.Timestamp
}

/**
 * List users with pagination
 * GET /adminListUsers?limit=20&startAfter=uid
 */
export const adminListUsers = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'users:read')

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const startAfter = req.query.startAfter as string | undefined

      let query = db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limit)

      if (startAfter) {
        const startDoc = await db.collection('users').doc(startAfter).get()
        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      const snapshot = await query.get()
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      }))

      // Get total count (cached approach for performance)
      const countSnapshot = await db.collection('users').count().get()
      const totalCount = countSnapshot.data().count

      await logAdminAction(adminInfo.uid, 'users:list', { limit, startAfter })

      res.json({
        success: true,
        users,
        totalCount,
        hasMore: users.length === limit,
        nextCursor: users.length > 0 ? users[users.length - 1].uid : null,
      })

    } catch (error) {
      console.error('adminListUsers error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)

/**
 * Get single user details
 * GET /adminGetUser?uid=xxx
 */
export const adminGetUser = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'users:read')

      const uid = req.query.uid as string
      if (!uid) {
        res.status(400).json({ success: false, error: 'User ID required' })
        return
      }

      // Get user profile from Firestore
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        res.status(404).json({ success: false, error: 'User not found' })
        return
      }

      const userData = userDoc.data() as UserProfile

      // Get user's decks count
      const decksSnapshot = await db.collection('decks')
        .where('authorId', '==', uid)
        .count()
        .get()
      const deckCount = decksSnapshot.data().count

      // Get Firebase Auth user info
      let authUser = null
      try {
        const authRecord = await admin.auth().getUser(uid)
        authUser = {
          emailVerified: authRecord.emailVerified,
          disabled: authRecord.disabled,
          lastSignInTime: authRecord.metadata.lastSignInTime,
          creationTime: authRecord.metadata.creationTime,
          providerData: authRecord.providerData.map(p => ({
            providerId: p.providerId,
            email: p.email,
          })),
        }
      } catch {
        // Auth user might not exist
      }

      await logAdminAction(adminInfo.uid, 'users:view', { targetUid: uid })

      // Destructure to avoid duplicate uid when spreading
      const { uid: _uid, createdAt, updatedAt, ...restUserData } = userData
      void _uid // Explicitly unused

      res.json({
        success: true,
        user: {
          uid: userDoc.id,
          ...restUserData,
          createdAt: createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: updatedAt?.toDate?.()?.toISOString() || null,
          deckCount,
          auth: authUser,
        },
      })

    } catch (error) {
      console.error('adminGetUser error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)

/**
 * Update user (credits, subscription, etc.)
 * POST /adminUpdateUser
 * Body: { uid, updates: { credits?, subscription?, displayName? } }
 */
export const adminUpdateUser = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'users:write')

      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' })
        return
      }

      const { uid, updates } = req.body as {
        uid: string
        updates: {
          credits?: number
          subscription?: 'free' | 'pro' | 'unlimited'
          displayName?: string
        }
      }

      if (!uid || !updates) {
        res.status(400).json({ success: false, error: 'User ID and updates required' })
        return
      }

      // Validate updates
      const allowedFields = ['credits', 'subscription', 'displayName']
      const updateData: Record<string, unknown> = {}

      for (const [key, value] of Object.entries(updates)) {
        if (!allowedFields.includes(key)) {
          res.status(400).json({ success: false, error: `Invalid field: ${key}` })
          return
        }

        if (key === 'credits' && (typeof value !== 'number' || value < 0)) {
          res.status(400).json({ success: false, error: 'Credits must be a non-negative number' })
          return
        }

        if (key === 'subscription' && !['free', 'pro', 'unlimited'].includes(value as string)) {
          res.status(400).json({ success: false, error: 'Invalid subscription tier' })
          return
        }

        updateData[key] = value
      }

      // Get current user data for audit log
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        res.status(404).json({ success: false, error: 'User not found' })
        return
      }

      const previousData = userDoc.data()

      // Apply update
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp()
      await db.collection('users').doc(uid).update(updateData)

      await logAdminAction(adminInfo.uid, 'users:update', {
        targetUid: uid,
        updates,
        previousValues: {
          credits: previousData?.credits,
          subscription: previousData?.subscription,
          displayName: previousData?.displayName,
        },
      })

      res.json({
        success: true,
        message: 'User updated successfully',
      })

    } catch (error) {
      console.error('adminUpdateUser error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)

/**
 * Search users by email or display name
 * GET /adminSearchUsers?q=searchterm&limit=20
 */
export const adminSearchUsers = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'users:read')

      const searchQuery = (req.query.q as string || '').toLowerCase().trim()
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)

      if (!searchQuery || searchQuery.length < 2) {
        res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' })
        return
      }

      // Search by email (prefix match)
      const emailResults = await db.collection('users')
        .where('email', '>=', searchQuery)
        .where('email', '<=', searchQuery + '\uf8ff')
        .limit(limit)
        .get()

      // Search by displayName (prefix match)
      const nameResults = await db.collection('users')
        .where('displayName', '>=', searchQuery)
        .where('displayName', '<=', searchQuery + '\uf8ff')
        .limit(limit)
        .get()

      // Combine and deduplicate results
      const usersMap = new Map<string, unknown>()

      const processDoc = (doc: admin.firestore.DocumentSnapshot) => {
        if (!usersMap.has(doc.id)) {
          const data = doc.data()
          usersMap.set(doc.id, {
            uid: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
          })
        }
      }

      emailResults.docs.forEach(processDoc)
      nameResults.docs.forEach(processDoc)

      const users = Array.from(usersMap.values()).slice(0, limit)

      await logAdminAction(adminInfo.uid, 'users:search', { query: searchQuery, resultCount: users.length })

      res.json({
        success: true,
        users,
        totalResults: users.length,
      })

    } catch (error) {
      console.error('adminSearchUsers error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)
