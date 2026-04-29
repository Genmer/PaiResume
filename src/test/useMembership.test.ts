import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}))

const mockMembershipStatus = {
  membershipStatus: 'ACTIVE',
  membershipTier: 'PRO' as const,
  membershipExpiresAt: '2025-12-31',
  remainingDays: 180,
  isPermanent: false,
  jdParseRemaining: 50,
}

const mockActivityConfig = {
  activityTier: 'LITE',
  activityDurationDays: 30,
  activityEnabled: true,
  activityStartAt: '2025-01-01',
  activityEndAt: '2025-12-31',
  activityLabel: '限时免费',
}

function setupMocks(statusOverride?: object, activityOverride?: object | null) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/membership/status') {
      return Promise.resolve({
        data: { code: 200, data: statusOverride ?? mockMembershipStatus },
      })
    }
    if (url === '/membership/activity') {
      if (activityOverride === null) {
        return Promise.resolve({ data: { code: 200, data: null } })
      }
      return Promise.resolve({
        data: { code: 200, data: activityOverride ?? mockActivityConfig },
      })
    }
    return Promise.reject(new Error('Unknown URL'))
  })
}

describe('useMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns membershipTier, remainingDays, isPermanent from status', async () => {
    setupMocks()

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.membershipTier).toBe('PRO')
    expect(result.current.remainingDays).toBe(180)
    expect(result.current.isPermanent).toBe(false)
    expect(result.current.isMember).toBe(true)
    expect(result.current.isPro).toBe(true)
    expect(result.current.isLite).toBe(false)
    expect(result.current.jdParseRemaining).toBe(50)
  })

  it('returns FREE defaults when no cached status', async () => {
    setupMocks(
      {
        membershipStatus: 'FREE',
        membershipTier: 'FREE',
        membershipExpiresAt: null,
        remainingDays: null,
        isPermanent: false,
        jdParseRemaining: 0,
      },
      null,
    )

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.membershipTier).toBe('FREE')
    expect(result.current.isMember).toBe(false)
    expect(result.current.remainingDays).toBeNull()
    expect(result.current.isPermanent).toBe(false)
  })

  it('redeemCode calls API and refreshes status', async () => {
    const redeemedStatus = {
      ...mockMembershipStatus,
      membershipTier: 'MAX' as const,
      remainingDays: 365,
    }

    setupMocks()

    mockPost.mockImplementation((url: string) => {
      if (url === '/membership/redeem') {
        return Promise.resolve({
          data: { code: 200, data: redeemedStatus },
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.membershipTier).toBe('PRO')

    await act(async () => {
      await result.current.redeemCode('TEST-CODE-123')
    })

    expect(mockPost).toHaveBeenCalledWith('/membership/redeem', {
      code: 'TEST-CODE-123',
    })
    expect(result.current.membershipTier).toBe('MAX')
    expect(result.current.remainingDays).toBe(365)
  })

  it('claimActivity calls API and refreshes status', async () => {
    const claimedStatus = {
      ...mockMembershipStatus,
      membershipTier: 'LITE' as const,
      remainingDays: 30,
    }

    setupMocks()

    mockPost.mockImplementation((url: string) => {
      if (url === '/membership/activity-redeem') {
        return Promise.resolve({
          data: { code: 200, data: claimedStatus },
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.claimActivity()
    })

    expect(mockPost).toHaveBeenCalledWith('/membership/activity-redeem')
    expect(result.current.membershipTier).toBe('LITE')
    expect(result.current.remainingDays).toBe(30)
  })

  it('refresh updates cachedStatus', async () => {
    const updatedStatus = {
      ...mockMembershipStatus,
      membershipTier: 'MAX' as const,
      remainingDays: 365,
      isPermanent: true,
    }

    let getStatusCallCount = 0
    mockGet.mockImplementation((url: string) => {
      if (url === '/membership/status') {
        getStatusCallCount++
        const data = getStatusCallCount > 1 ? updatedStatus : mockMembershipStatus
        return Promise.resolve({
          data: { code: 200, data },
        })
      }
      if (url === '/membership/activity') {
        return Promise.resolve({
          data: { code: 200, data: null },
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.membershipTier).toBe('PRO')

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.membershipTier).toBe('MAX')
    expect(result.current.isPermanent).toBe(true)
    expect(result.current.isMax).toBe(true)
  })

  it('sets error when API call fails', async () => {
    const unhandledRejections: unknown[] = []
    const handler = (e: unknown) => { unhandledRejections.push(e) }
    process.on('unhandledRejection', handler)

    mockGet.mockImplementation((url: string) => {
      if (url === '/membership/status') {
        return Promise.reject(new Error('Network error'))
      }
      if (url === '/membership/activity') {
        return Promise.resolve({
          data: { code: 200, data: null },
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    process.off('unhandledRejection', handler)
  }, 10000)

  it('fetches activity info on mount', async () => {
    setupMocks()

    const { useMembership } = await import('../hooks/useMembership')
    const { result } = renderHook(() => useMembership())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.activityInfo).toEqual(mockActivityConfig)
    expect(mockGet).toHaveBeenCalledWith('/membership/activity')
  })
})