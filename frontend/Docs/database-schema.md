# MagicAI Database Schema

## Overview
This document outlines the secure Firebase Firestore database schema for MagicAI, with special focus on financial data security and compliance.

## Security Levels
- **PUBLIC**: Readable by everyone
- **USER**: Readable/writable by authenticated users (own data)
- **ADMIN**: Readable/writable by admin roles only
- **SUPER_ADMIN**: Readable/writable by super admin roles only
- **SYSTEM**: Only accessible by Cloud Functions

## Collections

### 1. users (USER)
```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  subscription: {
    status: 'free' | 'trial' | 'premium' | 'pro';
    tier: 'free' | 'premium' | 'pro';
    trialEndsAt?: Timestamp;
    subscriptionId?: string;
  };
  usage: {
    monthlyAnalyses: number;
    totalAnalyses: number;
    lastAnalysisAt?: Timestamp;
  };
}
```

### 2. user_subscriptions (ADMIN)
```typescript
interface UserSubscription {
  id: string; // userId
  userId: string;
  userEmail: string;
  userName?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  tier: 'free' | 'premium' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  trialStart?: Timestamp;
  trialEnd?: Timestamp;
  canceledAt?: Timestamp;
  cancelAtPeriodEnd: boolean;
  
  // Financial data
  monthlyRevenue: number; // Current monthly revenue from this user
  totalRevenue: number; // Lifetime revenue from this user
  lastPaymentDate?: Timestamp;
  nextPaymentDate?: Timestamp;
  hasFailedPayments: boolean;
  
  // Payment method (tokenized)
  paymentMethod?: {
    brand: string; // 'visa', 'mastercard', etc.
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  
  // Usage tracking
  usage: {
    totalAnalyses: number;
    monthlyAnalyses: number;
    totalSavedDecks: number;
    lastActivity?: Timestamp;
  };
  
  // Admin data
  adminNotes?: AdminNote[];
  tags?: string[];
}
```

### 3. transactions (SUPER_ADMIN)
```typescript
interface Transaction {
  id: string;
  userId: string;
  type: 'subscription' | 'one_time' | 'refund' | 'adjustment';
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  amount: number; // in cents
  currency: 'AUD' | 'USD';
  description: string;
  
  // Stripe data
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  
  // Tax information (for BAS reporting)
  gstAmount?: number; // GST component in cents
  gstRate?: number; // GST rate (0.10 for 10%)
  isGstApplicable: boolean;
  taxExemptReason?: string;
  
  // Timestamps
  createdAt: Timestamp;
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
  
  // Metadata
  metadata: {
    subscriptionPeriod?: {
      start: Timestamp;
      end: Timestamp;
    };
    source: 'web' | 'api' | 'admin';
    adminId?: string; // If created by admin
  };
}
```

### 4. revenue_analytics (SUPER_ADMIN)
```typescript
interface RevenueAnalytics {
  id: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodStart: Timestamp;
  periodEnd: Timestamp;
  year: number;
  month?: number; // 1-12
  quarter?: number; // 1-4
  
  // Revenue metrics
  totalRevenue: number; // Total revenue in cents
  gstRevenue: number; // GST component in cents
  netRevenue: number; // Revenue minus GST
  
  // Subscription metrics
  activeSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  trialUsers: number;
  
  // Payment metrics
  successfulPayments: number;
  failedPayments: number;
  refundAmount: number;
  
  // Breakdown by tier
  revenueByTier: {
    free: number;
    premium: number;
    pro: number;
  };
  
  // Generated timestamp
  generatedAt: Timestamp;
}
```

### 5. bas_reports (SUPER_ADMIN)
```typescript
interface BASReport {
  id: string;
  financialYear: number; // e.g., 2024
  quarter: 1 | 2 | 3 | 4;
  status: 'draft' | 'review' | 'submitted' | 'accepted';
  
  // BAS fields (Australian Business Activity Statement)
  g1: number; // Total sales
  g2: number; // Export sales
  g3: number; // Other GST-free sales
  g4: number; // Input taxed sales
  g7: number; // Adjustments
  g10: number; // Capital purchases
  g11: number; // Non-capital purchases
  g13: number; // Credit claimed for GST on imports
  g14: number; // Adjustments for GST on imports
  
  // Calculated fields
  g9: number; // GST on sales
  g20: number; // GST on purchases
  g18: number; // Net amount (refund/payment)
  
  // Timestamps
  periodStart: Timestamp;
  periodEnd: Timestamp;
  dueDate: Timestamp;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
  
  // Metadata
  createdBy: string; // Admin user ID
  notes?: string;
  attachments?: string[]; // File references
}
```

### 6. tax_documents (SUPER_ADMIN)
```typescript
interface TaxDocument {
  id: string;
  type: 'invoice' | 'receipt' | 'bas_report' | 'annual_summary';
  userId?: string; // For user-specific documents
  
  // Document details
  documentNumber: string;
  description: string;
  amount: number;
  gstAmount: number;
  currency: 'AUD' | 'USD';
  
  // Tax information
  abn?: string; // Australian Business Number
  gstRegistered: boolean;
  taxInvoice: boolean;
  
  // File storage
  fileUrl: string; // Cloud Storage URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  
  // Timestamps
  issueDate: Timestamp;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  
  // Status
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
  
  // Related data
  transactionId?: string;
  basReportId?: string;
}
```

### 7. admin_roles (ADMIN)
```typescript
interface AdminRole {
  id: string; // userId
  role: 'owner' | 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: {
    users: ('read' | 'write' | 'delete')[];
    subscriptions: ('read' | 'write' | 'delete')[];
    financials: ('read' | 'write' | 'export')[];
    system: ('manage_feature_flags' | 'view_analytics' | 'manage_admins')[];
  };
  canPerformCostActions: boolean; // For high-cost operations
  createdAt: Timestamp;
  createdBy: string; // Admin who created this role
  lastActiveAt: Timestamp;
}
```

### 8. admin_logs (ADMIN)
```typescript
interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId?: string;
  targetResource?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Action details
  description: string;
  changes?: {
    before: any;
    after: any;
  };
  
  // Metadata
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
  
  // Financial actions (for audit trail)
  financialImpact?: {
    affectedRevenue: number;
    transactionIds: string[];
  };
}
```

### 9. admin_notes (ADMIN)
```typescript
interface AdminNote {
  id: string;
  userId: string; // User this note is about
  adminId: string; // Admin who created the note
  adminEmail: string;
  
  category: 'general' | 'billing' | 'support' | 'technical' | 'account';
  note: string;
  isInternal: boolean; // Not visible to user
  priority: 'low' | 'medium' | 'high';
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Follow-up
  followUpDate?: Timestamp;
  status: 'open' | 'resolved' | 'archived';
}
```

### 10. financial_metrics (SUPER_ADMIN)
```typescript
interface FinancialMetrics {
  id: string;
  date: Timestamp;
  
  // Overview metrics
  overview: {
    activeSubscribers: number;
    totalMRR: number; // Monthly Recurring Revenue
    trialUsers: number;
    churnRate: number;
  };
  
  // Payment metrics
  payments: {
    failedPayments: number;
    successfulPayments: number;
    refundAmount: number;
    chargebackAmount: number;
  };
  
  // Growth metrics
  growth: {
    newSignups: number;
    newSubscriptions: number;
    upgrades: number;
    downgrades: number;
  };
  
  // Financial health
  health: {
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
    paymentFailureRate: number;
    revenueGrowthRate: number;
  };
  
  generatedAt: Timestamp;
}
```

## Security Rules Summary

1. **Financial Data**: Only super admins can access transactions, revenue analytics, and BAS reports
2. **User Data**: Users can access their own data, admins can read all user data
3. **Admin Data**: Only admins can access admin logs and notes
4. **Subscription Data**: Admins can manage all subscriptions, users can read their own
5. **Stripe Webhooks**: Only Cloud Functions can write to webhook logs

## Compliance Features

1. **GST/Tax Calculation**: All transactions include GST calculations for Australian compliance
2. **BAS Reporting**: Automated quarterly BAS report generation
3. **Audit Trail**: Complete admin activity logging
4. **Data Security**: Sensitive financial data is encrypted and access-controlled
5. **GDPR Compliance**: User data can be exported and deleted upon request

## Backup and Security

1. **Daily Backups**: Automated daily backups of all financial data
2. **Encryption**: All sensitive data encrypted at rest and in transit
3. **Access Logging**: All admin access to financial data is logged
4. **Role-Based Access**: Strict role-based access controls
5. **Data Retention**: Financial records retained for 7 years (Australian requirement)
