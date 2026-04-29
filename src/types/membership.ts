export type MembershipTier = 'FREE' | 'LITE' | 'PRO' | 'MAX'

export interface PricingPlan {
  tier: MembershipTier
  displayName: string
  description: string
  price: number  // monthly price in yuan
  priceUnit: string
  jdParseLimit: number  // monthly, -1 = unlimited
  mockInterviewLimit: number  // monthly
  errorCheckLevel: 'SUMMARY' | 'DETAILED'
  atsCheckLevel: 'BASIC' | 'FULL'
  features: string[]
  isPopular?: boolean
  badge?: string
  ctaText: string
}

export interface ActivationCode {
  id: number
  code: string
  tier: string
  durationDays: number
  batchId: string | null
  codeStatus: string
  usedByUserId: number | null
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface ActivityConfig {
  activityTier: string | null
  activityDurationDays: number
  activityEnabled: boolean
  activityStartAt: string | null
  activityEndAt: string | null
  activityLabel: string | null
}

export interface MembershipStatusResponse {
  membershipStatus: string
  membershipTier: MembershipTier
  membershipExpiresAt: string | null
  remainingDays: number | null
  isPermanent: boolean
  jdParseRemaining: number
  mockInterviewRemaining: number
  appMode?: 'DEV' | 'PRO'
  activationCode?: string
}

export interface ActivationCodeStats {
  total: number
  unused: number
  used: number
  disabled: number
}

export interface TierDistribution {
  tier: string
  count: number
}

export interface SubscriptionTrend {
  date: string
  newSubscriptions: number
  totalSubscriptions: number
}

export interface ConversionFunnel {
  stage: string
  count: number
}

export interface AverageRemainingDays {
  tier: string
  averageDays: number
  userCount: number
}

export interface RegistrationTrend {
  date: string
  newUsers: number
}

export interface CodeStatsDetailed extends ActivationCodeStats {
  byTier: Record<string, number>
}

export interface GrantMembershipRequest {
  tier: string
  durationDays: number
}