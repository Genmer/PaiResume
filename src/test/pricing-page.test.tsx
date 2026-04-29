import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PricingPage from '../pages/PricingPage'
import type { MembershipTier, ActivityConfig } from '../types/membership'

const { mockRefresh, mockGetActivity } = vi.hoisted(() => ({
  mockRefresh: vi.fn().mockResolvedValue(undefined),
  mockGetActivity: vi.fn(),
}))

let membershipReturnValue: ReturnType<typeof import('../hooks/useMembership')['useMembership']> = {
  isMember: false,
  membershipStatus: 'FREE',
  membershipTier: 'FREE' as MembershipTier,
  membershipExpiresAt: null,
  remainingDays: null,
  isPermanent: false,
  jdParseRemaining: 0,
  mockInterviewRemaining: 0,
  isLite: false,
  isPro: false,
  isMax: false,
  appMode: 'DEV' as const,
  loading: false,
  error: null,
  activityInfo: null,
  refresh: mockRefresh,
  refreshMembership: mockRefresh,
  redeemCode: vi.fn(),
  claimActivity: vi.fn(),
}

vi.mock('../hooks/useMembership', () => ({
  useMembership: () => membershipReturnValue,
}))

vi.mock('../api/membership', () => ({
  membershipApi: {
    getActivity: mockGetActivity,
    redeemCode: vi.fn(),
    activityRedeem: vi.fn(),
    quote: vi.fn(),
    status: vi.fn(),
  },
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string; className?: string }) =>
    <a href={props.to} className={props.className}>{children}</a>,
}))

vi.mock('../components/branding/LogoMark', () => ({
  LogoMark: ({ className }: { className?: string }) =>
    <div data-testid="logo-mark" className={className}>Logo</div>,
}))

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    membershipReturnValue = {
      isMember: false,
      membershipStatus: 'FREE',
      membershipTier: 'FREE' as MembershipTier,
      membershipExpiresAt: null,
      remainingDays: null,
      isPermanent: false,
      jdParseRemaining: 0,
      mockInterviewRemaining: 0,
      isLite: false,
      isPro: false,
      isMax: false,
      appMode: 'DEV' as const,
      loading: false,
      error: null,
      activityInfo: null,
      refresh: mockRefresh,
      refreshMembership: mockRefresh,
      redeemCode: vi.fn(),
      claimActivity: vi.fn(),
    }
  })

  it('shows activity CTA button when activity is active and user is on a lower tier', async () => {
    membershipReturnValue = {
      ...membershipReturnValue,
      membershipTier: 'FREE' as MembershipTier,
    }

    const activityData: ActivityConfig = {
      activityTier: 'LITE',
      activityDurationDays: 30,
      activityEnabled: true,
      activityStartAt: '2025-01-01',
      activityEndAt: '2025-12-31',
      activityLabel: '限时免费',
    }

    mockGetActivity.mockResolvedValue({
      data: { code: 200, data: activityData },
    })

    render(<PricingPage />)

    await waitFor(() => {
      expect(mockGetActivity).toHaveBeenCalled()
    }, { timeout: 3000 })

    const activityButtons = await screen.findAllByRole('button', { name: '限时免费' })
    expect(activityButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows redeem code input when no activity is active', async () => {
    mockGetActivity.mockResolvedValue({
      data: { code: 200, data: null },
    })

    await act(async () => {
      render(<PricingPage />)
    })

    expect(await screen.findByText('激活码兑换', undefined, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入激活码')).toBeInTheDocument()
    expect(screen.getByText('兑换')).toBeInTheDocument()
  })

  it('shows "当前方案" badge on current plan', async () => {
    membershipReturnValue = {
      ...membershipReturnValue,
      isMember: true,
      membershipStatus: 'ACTIVE',
      membershipTier: 'PRO' as MembershipTier,
      membershipExpiresAt: '2025-12-31',
      remainingDays: 180,
      isPermanent: false,
      jdParseRemaining: 50,
      isLite: false,
      isPro: true,
      isMax: false,
    }

    mockGetActivity.mockResolvedValue({
      data: { code: 200, data: null },
    })

    await act(async () => {
      render(<PricingPage />)
    })

    expect(await screen.findByText('专业版', undefined, { timeout: 3000 })).toBeInTheDocument()
    const badges = screen.getAllByText('当前方案')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('renders all four pricing plan cards', async () => {
    mockGetActivity.mockResolvedValue({
      data: { code: 200, data: null },
    })

    await act(async () => {
      render(<PricingPage />)
    })

    await waitFor(() => {
      expect(mockGetActivity).toHaveBeenCalled()
    })

    expect(screen.getByText('免费版')).toBeInTheDocument()
    expect(screen.getByText('基础版')).toBeInTheDocument()
    expect(screen.getByText('专业版')).toBeInTheDocument()
    expect(screen.getByText('旗舰版')).toBeInTheDocument()
  })
})