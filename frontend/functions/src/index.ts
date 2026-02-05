/**
 * MagicAI Firebase Cloud Functions
 * Admin Portal Backend
 */

import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
admin.initializeApp()

// Export admin functions
export { adminListUsers, adminGetUser, adminUpdateUser, adminSearchUsers } from './admin/users'
export { adminGetStats, adminGetUsageStats } from './admin/analytics'
export { adminLogAction, adminGetAuditLogs } from './admin/audit'
export { adminSetupOwner } from './admin/setup'
