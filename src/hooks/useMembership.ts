import { useState, useCallback, useRef, useEffect } from 'react'
import client from '../api/client'
import type { MembershipStatusResponse, MembershipTier, ActivityConfig } from '../types/membership'

interface MembershipStatus extends MembershipStatusResponse {}

let cachedStatus: MembershipStatus | null = null

export function useMembership() {
  const [status, setStatus] = useState<MembershipStatus | null>(cachedStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activityInfo, setActivityInfo] = useState<ActivityConfig | null>(null)
  const initialFetchDone = useRef(false)

  const tier: MembershipTier = status?.membershipTier ?? 'FREE'

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await client.get<{ code: number; data: MembershipStatus }>(
        '/membership/status'
      )
      cachedStatus = (res.data as unknown as MembershipStatus)
      setStatus(cachedStatus)
      return cachedStatus
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取会员状态失败'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivity = useCallback(async () => {
    try {
      const { data: res } = await client.get<{ code: number; data: ActivityConfig | null }>('/membership/activity')
      setActivityInfo(res.data as unknown as ActivityConfig | null)
    } catch {
      // silently fail — activity info is optional
    }
  }, [])

  const redeemCode = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await client.post<{ code: number; data: MembershipStatus }>('/membership/redeem', { code })
      cachedStatus = res.data as unknown as MembershipStatus
      setStatus(cachedStatus)
      return cachedStatus
    } catch (err) {
      const message = err instanceof Error ? err.message : '兑换失败'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const claimActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await client.post<{ code: number; data: MembershipStatus }>('/membership/activity-redeem')
      cachedStatus = res.data as unknown as MembershipStatus
      setStatus(cachedStatus)
      return cachedStatus
    } catch (err) {
      const message = err instanceof Error ? err.message : '领取失败'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      if (cachedStatus) {
        refresh()
      }
    }
    window.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refresh])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  if (!initialFetchDone.current && !cachedStatus) {
    initialFetchDone.current = true
    refresh()
  }

  return {
    isMember: tier !== 'FREE',
    membershipStatus: status?.membershipStatus ?? 'FREE',
    membershipTier: tier,
    membershipExpiresAt: status?.membershipExpiresAt ?? null,
    remainingDays: status?.remainingDays ?? null,
    isPermanent: status?.isPermanent ?? false,
    jdParseRemaining: status?.jdParseRemaining ?? 0,
    mockInterviewRemaining: status?.mockInterviewRemaining ?? 0,
    isLite: tier === 'LITE',
    isPro: tier === 'PRO',
    isMax: tier === 'MAX',
    appMode: status?.appMode ?? 'DEV',
    loading,
    error,
    activityInfo,
    refresh,
    refreshMembership: refresh,
    redeemCode,
    claimActivity,
  }
}
