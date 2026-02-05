/**
 * Admin Analytics Functions
 */

import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { verifyAdmin } from '../middleware/auth'
import { logAdminAction } from './audit'

const db = admin.firestore()

/**
 * Get overall platform statistics
 * GET /adminGetStats
 */
export const adminGetStats = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'analytics:read')

      // Total users
      const usersCount = await db.collection('users').count().get()
      const totalUsers = usersCount.data().count

      // Total decks
      const decksCount = await db.collection('decks').count().get()
      const totalDecks = decksCount.data().count

      // Public decks
      const publicDecksCount = await db.collection('decks')
        .where('isPublic', '==', true)
        .count()
        .get()
      const publicDecks = publicDecksCount.data().count

      // Users by subscription tier
      const freeUsers = await db.collection('users')
        .where('subscription', '==', 'free')
        .count()
        .get()
      const proUsers = await db.collection('users')
        .where('subscription', '==', 'pro')
        .count()
        .get()
      const unlimitedUsers = await db.collection('users')
        .where('subscription', '==', 'unlimited')
        .count()
        .get()

      // Total credits in circulation
      const usersSnapshot = await db.collection('users').select('credits').get()
      let totalCredits = 0
      usersSnapshot.docs.forEach(doc => {
        totalCredits += doc.data().credits || 0
      })

      // Users created in last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const newUsersCount = await db.collection('users')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .count()
        .get()
      const newUsersLast7Days = newUsersCount.data().count

      // Decks created in last 7 days
      const newDecksCount = await db.collection('decks')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .count()
        .get()
      const newDecksLast7Days = newDecksCount.data().count

      // Decks by format
      const formats = ['standard', 'modern', 'commander', 'pioneer', 'legacy', 'vintage', 'pauper']
      const decksByFormat: Record<string, number> = {}

      for (const format of formats) {
        const formatCount = await db.collection('decks')
          .where('format', '==', format)
          .count()
          .get()
        decksByFormat[format] = formatCount.data().count
      }

      await logAdminAction(adminInfo.uid, 'analytics:stats', {})

      res.json({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            newLast7Days: newUsersLast7Days,
            byTier: {
              free: freeUsers.data().count,
              pro: proUsers.data().count,
              unlimited: unlimitedUsers.data().count,
            },
          },
          decks: {
            total: totalDecks,
            public: publicDecks,
            newLast7Days: newDecksLast7Days,
            byFormat: decksByFormat,
          },
          credits: {
            totalInCirculation: totalCredits,
          },
          generatedAt: new Date().toISOString(),
        },
      })

    } catch (error) {
      console.error('adminGetStats error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)

/**
 * Get usage statistics over time (for charts)
 * GET /adminGetUsageStats?days=30
 */
export const adminGetUsageStats = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'analytics:read')

      const days = Math.min(parseInt(req.query.days as string) || 30, 90)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDate.setHours(0, 0, 0, 0)

      // Get daily user signups
      const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .orderBy('createdAt', 'asc')
        .get()

      // Get daily deck creations
      const decksSnapshot = await db.collection('decks')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .orderBy('createdAt', 'asc')
        .get()

      // Aggregate by day
      const dailyStats: Record<string, { users: number; decks: number }> = {}

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        dailyStats[dateKey] = { users: 0, decks: 0 }
      }

      // Count users per day
      usersSnapshot.docs.forEach(doc => {
        const createdAt = doc.data().createdAt?.toDate?.()
        if (createdAt) {
          const dateKey = createdAt.toISOString().split('T')[0]
          if (dailyStats[dateKey]) {
            dailyStats[dateKey].users++
          }
        }
      })

      // Count decks per day
      decksSnapshot.docs.forEach(doc => {
        const createdAt = doc.data().createdAt?.toDate?.()
        if (createdAt) {
          const dateKey = createdAt.toISOString().split('T')[0]
          if (dailyStats[dateKey]) {
            dailyStats[dateKey].decks++
          }
        }
      })

      // Convert to array for charts
      const timeline = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      }))

      await logAdminAction(adminInfo.uid, 'analytics:usage', { days })

      res.json({
        success: true,
        timeline,
        summary: {
          totalNewUsers: usersSnapshot.size,
          totalNewDecks: decksSnapshot.size,
          periodDays: days,
        },
      })

    } catch (error) {
      console.error('adminGetUsageStats error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)
