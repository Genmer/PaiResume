import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { ActivationCode, ActivationCodeStats } from '../../types/membership'

const TIERS = ['LITE', 'PRO', 'MAX'] as const
const DURATIONS = [
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
  { label: '365天', value: 365 },
  { label: '永久', value: 0 },
] as const

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '未使用', value: 'UNUSED' },
  { label: '已使用', value: 'USED' },
  { label: '已禁用', value: 'DISABLED' },
] as const

function statusBadge(status: string) {
  switch (status) {
    case 'UNUSED':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'USED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'DISABLED':
      return 'bg-gray-100 text-gray-500 border-gray-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'UNUSED': return '未使用'
    case 'USED': return '已使用'
    case 'DISABLED': return '已禁用'
    default: return status
  }
}

function tierLabel(tier: string) {
  switch (tier) {
    case 'LITE': return '基础版'
    case 'PRO': return '专业版'
    case 'MAX': return '旗舰版'
    default: return tier
  }
}

function durationLabel(days: number) {
  if (days === 0) return '永久'
  return `${days}天`
}

interface CreateForm {
  tier: string
  durationDays: number
  quantity: number
  batchId: string
}

const EMPTY_FORM: CreateForm = {
  tier: 'LITE',
  durationDays: 30,
  quantity: 1,
  batchId: '',
}

export function ActivationCodesTab() {
  const [codes, setCodes] = useState<ActivationCode[]>([])
  const [stats, setStats] = useState<ActivationCodeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_FORM })

  const [filterStatus, setFilterStatus] = useState('')
  const [filterBatchId, setFilterBatchId] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const loadCodes = useCallback(async () => {
    try {
      const params: { status?: string; batchId?: string } = {}
      if (filterStatus) params.status = filterStatus
      if (filterBatchId.trim()) params.batchId = filterBatchId.trim()
      const { data: res } = await adminApi.listActivationCodes(params.status, params.batchId)
      setCodes(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载激活码失败')
    }
  }, [filterStatus, filterBatchId])

  const loadStats = useCallback(async () => {
    try {
      const { data: res } = await adminApi.getActivationCodeStats()
      setStats(res.data)
    } catch {
      // stats are non-critical
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void Promise.all([loadCodes(), loadStats()]).finally(() => setLoading(false))
  }, [loadCodes, loadStats])

  async function handleCreate() {
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const payload: { tier: string; durationDays: number; quantity: number; batchId?: string } = {
        tier: form.tier,
        durationDays: form.durationDays,
        quantity: form.quantity,
      }
      if (form.batchId.trim()) payload.batchId = form.batchId.trim()
      const { data: res } = await adminApi.createActivationCodes(payload)
      const created = res.data
      setSuccess(`成功创建 ${created.length} 个激活码`)
      setForm({ ...EMPTY_FORM })
      await Promise.all([loadCodes(), loadStats()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建激活码失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleDisable(id: number) {
    if (!window.confirm('确定要禁用此激活码吗？')) return
    try {
      await adminApi.disableActivationCode(id)
      setSuccess('激活码已禁用')
      await Promise.all([loadCodes(), loadStats()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '禁用失败')
    }
  }

  async function handleCopy(code: string, id: number) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // fallback
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
            <div className="text-sm text-gray-500">总计</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
            <div className="text-sm text-green-600">未使用</div>
            <div className="mt-1 text-2xl font-semibold text-green-700">{stats.unused}</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4">
            <div className="text-sm text-blue-600">已使用</div>
            <div className="mt-1 text-2xl font-semibold text-blue-700">{stats.used}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
            <div className="text-sm text-gray-500">已禁用</div>
            <div className="mt-1 text-2xl font-semibold text-gray-600">{stats.disabled}</div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-gray-900">创建激活码</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">等级</span>
            <select
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>{tierLabel(t)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">有效期</span>
            <select
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">数量</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Math.min(100, Math.max(1, Number(e.target.value))) }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">批次号（可选）</span>
            <input
              type="text"
              value={form.batchId}
              onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))}
              placeholder="例如：batch-2024-01"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
            />
          </label>
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {creating ? '创建中...' : '创建激活码'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">状态筛选</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">批次号筛选</span>
          <input
            type="text"
            value={filterBatchId}
            onChange={(e) => setFilterBatchId(e.target.value)}
            placeholder="输入批次号"
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </label>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-gray-900">激活码列表</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-3 pr-4 font-medium">激活码</th>
                <th className="py-3 pr-4 font-medium">等级</th>
                <th className="py-3 pr-4 font-medium">有效期</th>
                <th className="py-3 pr-4 font-medium">状态</th>
                <th className="py-3 pr-4 font-medium">使用者</th>
                <th className="py-3 pr-4 font-medium">使用时间</th>
                <th className="py-3 pr-4 font-medium">批次号</th>
                <th className="py-3 pr-4 font-medium">创建时间</th>
                <th className="py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">暂无激活码</td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code.id}>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => void handleCopy(code.code, code.id)}
                        className="font-mono text-sm text-primary-700 hover:text-primary-800 transition-colors"
                        title="点击复制"
                      >
                        {copiedId === code.id ? '✓ 已复制' : code.code}
                      </button>
                    </td>
                    <td className="py-3 pr-4">{tierLabel(code.tier)}</td>
                    <td className="py-3 pr-4">{durationLabel(code.durationDays)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(code.codeStatus)}`}>
                        {statusLabel(code.codeStatus)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{code.usedByUserId ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{code.usedAt ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{code.batchId ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{code.createdAt}</td>
                    <td className="py-3">
                      {code.codeStatus === 'UNUSED' && (
                        <button
                          type="button"
                          onClick={() => void handleDisable(code.id)}
                          className="text-red-700 transition-colors hover:text-red-800"
                        >
                          禁用
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
