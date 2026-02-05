/**
 * Admin Authentication Middleware
 * Verifies that the caller is an authenticated admin user
 */

import * as admin from 'firebase-admin'
import { HttpsError } from 'firebase-functions/v2/https'

// Admin role hierarchy
export type AdminRole = 'owner' | 'super_admin' | 'admin' | 'moderator' | 'support'

export interface AdminUser {
  uid: string
  email: string
  role: AdminRole
  permissions: string[]
  createdAt: admin.firestore.Timestamp
}

// Role permissions mapping
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  owner: ['*'], // All permissions
  super_admin: [
    'users:read', 'users:write', 'users:delete',
    'credits:read', 'credits:write',
    'analytics:read',
    'audit:read',
    'admins:read', 'admins:write',
  ],
  admin: [
    'users:read', 'users:write',
    'credits:read', 'credits:write',
    'analytics:read',
    'audit:read',
  ],
  moderator: [
    'users:read',
    'credits:read',
    'analytics:read',
  ],
  support: [
    'users:read',
    'credits:read',
  ],
}

/**
 * Verify that the request is from an authenticated admin user
 */
export async function verifyAdmin(
  authHeader: string | undefined,
  requiredPermission?: string
): Promise<{ uid: string; email: string; role: AdminRole }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', 'Missing or invalid authorization header')
  }

  const idToken = authHeader.split('Bearer ')[1]

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    const uid = decodedToken.uid
    const email = decodedToken.email || ''

    // Check if user is in admins collection
    const adminDoc = await admin.firestore().collection('admins').doc(uid).get()

    if (!adminDoc.exists) {
      throw new HttpsError('permission-denied', 'User is not an admin')
    }

    const adminData = adminDoc.data() as AdminUser
    const role = adminData.role

    // Check permission if required
    if (requiredPermission) {
      const permissions = ROLE_PERMISSIONS[role] || []
      const hasPermission = permissions.includes('*') || permissions.includes(requiredPermission)

      if (!hasPermission) {
        throw new HttpsError(
          'permission-denied',
          `Insufficient permissions. Required: ${requiredPermission}`
        )
      }
    }

    return { uid, email, role }

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error
    }
    console.error('Admin verification error:', error)
    throw new HttpsError('unauthenticated', 'Invalid authentication token')
  }
}

/**
 * Check if an email is the owner email
 */
export function isOwnerEmail(email: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL || ''
  return Boolean(ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase())
}
