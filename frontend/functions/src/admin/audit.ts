/**
 * Admin Audit Logging Functions
 */

import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { verifyAdmin } from '../middleware/auth'

const db = admin.firestore()

export interface AuditLogEntry {
  id?: string
  adminUid: string
  adminEmail?: string
  action: string
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: admin.firestore.Timestamp
}

/**
 * Log an admin action to the audit trail
 * Called internally by other admin functions
 */
export async function logAdminAction(
  adminUid: string,
  action: string,
  details: Record<string, unknown>,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    // Get admin email for audit record
    let adminEmail = ''
    try {
      const adminUser = await admin.auth().getUser(adminUid)
      adminEmail = adminUser.email || ''
    } catch {
      // Ignore error, email is optional
    }

    const logEntry: Omit<AuditLogEntry, 'id'> = {
      adminUid,
      adminEmail,
      action,
      details,
      ipAddress: context?.ipAddress || '',
      userAgent: context?.userAgent || '',
      timestamp: admin.firestore.Timestamp.now(),
    }

    await db.collection('audit_logs').add(logEntry)
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log admin action:', error)
  }
}

/**
 * Get audit logs with pagination
 * GET /adminGetAuditLogs?limit=50&startAfter=docId&action=users:update&adminUid=xxx
 */
export const adminGetAuditLogs = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization, 'audit:read')

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const startAfter = req.query.startAfter as string | undefined
      const actionFilter = req.query.action as string | undefined
      const adminUidFilter = req.query.adminUid as string | undefined

      let query: admin.firestore.Query = db.collection('audit_logs')
        .orderBy('timestamp', 'desc')

      // Apply filters
      if (actionFilter) {
        query = query.where('action', '==', actionFilter)
      }
      if (adminUidFilter) {
        query = query.where('adminUid', '==', adminUidFilter)
      }

      query = query.limit(limit)

      // Pagination
      if (startAfter) {
        const startDoc = await db.collection('audit_logs').doc(startAfter).get()
        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      const snapshot = await query.get()
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }))

      // Log this audit log access (but not recursively for audit:read actions)
      if (actionFilter !== 'audit:read') {
        await logAdminAction(adminInfo.uid, 'audit:read', {
          filters: { action: actionFilter, adminUid: adminUidFilter },
          resultCount: logs.length,
        })
      }

      res.json({
        success: true,
        logs,
        hasMore: logs.length === limit,
        nextCursor: logs.length > 0 ? logs[logs.length - 1].id : null,
      })

    } catch (error) {
      console.error('adminGetAuditLogs error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)

/**
 * Log an action from the frontend
 * POST /adminLogAction
 * Body: { action: string, details: object }
 */
export const adminLogAction = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      const adminInfo = await verifyAdmin(req.headers.authorization)

      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' })
        return
      }

      const { action, details } = req.body as {
        action: string
        details: Record<string, unknown>
      }

      if (!action) {
        res.status(400).json({ success: false, error: 'Action is required' })
        return
      }

      await logAdminAction(adminInfo.uid, action, details || {}, {
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
      })

      res.json({ success: true })

    } catch (error) {
      console.error('adminLogAction error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(error instanceof Error && 'code' in error ? 403 : 500).json({
        success: false,
        error: message,
      })
    }
  }
)
