/**
 * Admin Setup Function
 * One-time setup to create the initial admin user
 */

import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'

const db = admin.firestore()

/**
 * Initialize the owner as admin
 * POST /adminSetupOwner
 * This function can only be called once and only by the owner email
 */
export const adminSetupOwner = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' })
        return
      }

      // Get the authorization token
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Missing authorization' })
        return
      }

      const idToken = authHeader.split('Bearer ')[1]
      const decodedToken = await admin.auth().verifyIdToken(idToken)
      const uid = decodedToken.uid
      const email = decodedToken.email || ''

      // Check if this is the owner email
      const ownerEmail = process.env.OWNER_EMAIL || 'john.merchan@gmail.com'
      if (email.toLowerCase() !== ownerEmail.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'Only the owner can run initial setup'
        })
        return
      }

      // Check if admins collection already has documents
      const adminsSnapshot = await db.collection('admins').limit(1).get()
      if (!adminsSnapshot.empty) {
        res.status(400).json({
          success: false,
          error: 'Admin setup already completed. Use the admin portal to add more admins.'
        })
        return
      }

      // Create the owner admin document
      await db.collection('admins').doc(uid).set({
        email: email,
        role: 'owner',
        permissions: ['*'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Log this action
      await db.collection('audit_logs').add({
        adminUid: uid,
        adminEmail: email,
        action: 'admin:setup',
        details: { message: 'Initial admin setup completed' },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })

      res.json({
        success: true,
        message: 'Admin setup completed successfully',
        admin: {
          uid,
          email,
          role: 'owner',
        },
      })

    } catch (error) {
      console.error('adminSetupOwner error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ success: false, error: message })
    }
  }
)
