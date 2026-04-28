import client, { type ApiEnvelope } from './client'
import type { MembershipStatusResponse } from '../types/membership'

export interface MembershipQuote {
  listPrice: number
  discountAmount: number
  payableAmount: number
  couponStatus: string
  paymentEnabled: boolean
}

export const membershipApi = {
  quote: (couponCode?: string) =>
    client.post<ApiEnvelope<MembershipQuote>>('/membership/quote', { couponCode }),

  status: () =>
    client.get<ApiEnvelope<MembershipStatusResponse>>('/membership/status'),

  redeemCode: (code: string) =>
    client.post<ApiEnvelope<MembershipStatusResponse>>('/membership/redeem', { code }),

  activityRedeem: () =>
    client.post<ApiEnvelope<MembershipStatusResponse>>('/membership/activity-redeem'),

  getActivity: () =>
    client.get<ApiEnvelope<import('../types/membership').ActivityConfig | null>>('/membership/activity'),
}
