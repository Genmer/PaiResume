import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivationCodesTab } from '../components/admin/ActivationCodesTab'
import type { ActivationCode, ActivationCodeStats } from '../types/membership'

const { mockListCodes, mockGetStats, mockCreateCodes, mockDisableCode } = vi.hoisted(() => ({
  mockListCodes: vi.fn(),
  mockGetStats: vi.fn(),
  mockCreateCodes: vi.fn(),
  mockDisableCode: vi.fn(),
}))

vi.mock('../api/admin', () => ({
  adminApi: {
    listActivationCodes: mockListCodes,
    getActivationCodeStats: mockGetStats,
    createActivationCodes: mockCreateCodes,
    disableActivationCode: mockDisableCode,
  },
}))

const mockCodes: ActivationCode[] = [
  {
    id: 1,
    code: 'ACT-AAA-111',
    tier: 'LITE',
    durationDays: 30,
    batchId: 'batch-2024-01',
    codeStatus: 'UNUSED',
    usedByUserId: null,
    usedAt: null,
    expiresAt: '2025-12-31',
    createdAt: '2025-01-15',
  },
  {
    id: 2,
    code: 'ACT-BBB-222',
    tier: 'PRO',
    durationDays: 90,
    batchId: null,
    codeStatus: 'USED',
    usedByUserId: 42,
    usedAt: '2025-02-01',
    expiresAt: null,
    createdAt: '2025-01-10',
  },
  {
    id: 3,
    code: 'ACT-CCC-333',
    tier: 'MAX',
    durationDays: -1,
    batchId: null,
    codeStatus: 'DISABLED',
    usedByUserId: null,
    usedAt: null,
    expiresAt: null,
    createdAt: '2025-01-05',
  },
]

const mockStats: ActivationCodeStats = {
  total: 10,
  unused: 5,
  used: 3,
  disabled: 2,
}

function setupDefaultMocks() {
  mockListCodes.mockResolvedValue({ data: { code: 200, data: mockCodes } })
  mockGetStats.mockResolvedValue({ data: { code: 200, data: mockStats } })
}

describe('ActivationCodesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders code list with status badges', async () => {
    setupDefaultMocks()

    render(<ActivationCodesTab />)

    expect(await screen.findByText('ACT-AAA-111', undefined, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('ACT-BBB-222')).toBeInTheDocument()
    expect(screen.getByText('ACT-CCC-333')).toBeInTheDocument()

    expect(screen.getAllByText('未使用').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('已使用').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('已禁用').length).toBeGreaterThanOrEqual(1)
  })

  it('renders stats cards', async () => {
    setupDefaultMocks()

    render(<ActivationCodesTab />)

    expect(await screen.findByText('10', undefined, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

it('create form submits with correct tier/duration/quantity', async () => {
    setupDefaultMocks()
    mockCreateCodes.mockResolvedValue({ data: { code: 200, data: [mockCodes[0]] } })

    render(<ActivationCodesTab />)

    expect(await screen.findByRole('button', { name: '创建激活码' }, { timeout: 3000 })).toBeInTheDocument()

    const tierSelect = screen.getByDisplayValue('基础版')
    fireEvent.change(tierSelect, { target: { value: 'PRO' } })

    const durationSelect = screen.getByDisplayValue('30天')
    fireEvent.change(durationSelect, { target: { value: '90' } })

    const quantityInput = screen.getByRole('spinbutton')
    fireEvent.change(quantityInput, { target: { value: '5' } })

    const createButton = screen.getByRole('button', { name: '创建激活码' })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockCreateCodes).toHaveBeenCalledWith({
        tier: 'PRO',
        durationDays: 90,
        quantity: 5,
      })
    })
  })

  it('disable button calls API', async () => {
    setupDefaultMocks()
    mockDisableCode.mockResolvedValue({ data: { code: 200, data: undefined } })

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ActivationCodesTab />)

    expect(await screen.findByText('ACT-AAA-111', undefined, { timeout: 3000 })).toBeInTheDocument()

    const disableButtons = screen.getAllByText('禁用')
    expect(disableButtons.length).toBeGreaterThanOrEqual(1)

    fireEvent.click(disableButtons[0])

    await waitFor(() => {
      expect(mockDisableCode).toHaveBeenCalledWith(1)
    })
  })

  it('shows empty state when no codes exist', async () => {
    mockListCodes.mockResolvedValue({ data: { code: 200, data: [] } })
    mockGetStats.mockResolvedValue({ data: { code: 200, data: mockStats } })

    render(<ActivationCodesTab />)

    expect(await screen.findByText('暂无激活码', undefined, { timeout: 3000 })).toBeInTheDocument()
  })
})