import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { ActivityConfig } from '../../types/membership'

const TIERS = ['LITE', 'PRO', 'MAX'] as const

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getActivityStatus(config: ActivityConfig) {
  if (!config.activityEnabled) {
    return { label: '活动未启用', color: 'bg-gray-500' }
  }

  const now = Date.now()
  const start = config.activityStartAt ? new Date(config.activityStartAt).getTime() : null
  const end = config.activityEndAt ? new Date(config.activityEndAt).getTime() : null

  if (start && now < start) {
    return { label: '活动未开始', color: 'bg-yellow-500' }
  }
  if (end && now > end) {
    return { label: '活动已结束', color: 'bg-gray-500' }
  }
  return { label: '活动进行中', color: 'bg-green-500' }
}

function getRemainingTime(endAt: string | null): string {
  if (!endAt) return ''
  const diff = new Date(endAt).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
  return `剩余 ${hours} 小时`
}

interface FormState {
  activityEnabled: boolean
  activityTier: string
  activityDurationDays: number
  activityStartAt: string
  activityEndAt: string
  activityLabel: string
}

export function ActivityConfigTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [config, setConfig] = useState<ActivityConfig | null>(null)
  const [form, setForm] = useState<FormState>({
    activityEnabled: false,
    activityTier: 'LITE',
    activityDurationDays: 30,
    activityStartAt: '',
    activityEndAt: '',
    activityLabel: '',
  })

  useEffect(() => {
    void loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await adminApi.getActivityConfig()
      const cfg = res.data
      setConfig(cfg)
      setForm({
        activityEnabled: cfg.activityEnabled,
        activityTier: cfg.activityTier ?? 'LITE',
        activityDurationDays: cfg.activityDurationDays || 30,
        activityStartAt: toDatetimeLocal(cfg.activityStartAt),
        activityEndAt: toDatetimeLocal(cfg.activityEndAt),
        activityLabel: cfg.activityLabel ?? '',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载活动配置失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        activityEnabled: form.activityEnabled ? 1 : 0,
        activityTier: form.activityTier,
        activityDurationDays: form.activityDurationDays,
        activityStartAt: fromDatetimeLocal(form.activityStartAt),
        activityEndAt: fromDatetimeLocal(form.activityEndAt),
        activityLabel: form.activityLabel || null,
      }
      const { data: res } = await adminApi.updateActivityConfig(payload as any)
      setConfig(res.data)
      setSuccess('活动配置已保存')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-500">加载中...</span>
      </div>
    )
  }

  const status = config ? getActivityStatus(config) : null
  const remaining = config?.activityEndAt ? getRemainingTime(config.activityEndAt) : ''

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">活动状态</h3>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${status?.color}`}>
            {status?.label}
          </span>
          {status?.label === '活动进行中' && remaining && (
            <span className="text-gray-600 text-sm">{remaining}</span>
          )}
        </div>
        {config?.activityLabel && (
          <p className="mt-2 text-gray-500 text-sm">{config.activityLabel}</p>
        )}

        <h3 className="text-lg font-medium mb-4">活动配置</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动开关</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.activityEnabled}
                onChange={(e) => setForm({ ...form, activityEnabled: e.target.checked })}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">启用活动</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动等级</label>
            <select
              value={form.activityTier}
              onChange={(e) => setForm({ ...form, activityTier: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动时长（天）</label>
            <input
              type="number"
              min="1"
              value={form.activityDurationDays}
              onChange={(e) => setForm({ ...form, activityDurationDays: Number(e.target.value) })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="datetime-local"
              value={form.activityStartAt}
              onChange={(e) => setForm({ ...form, activityStartAt: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="datetime-local"
              value={form.activityEndAt}
              onChange={(e) => setForm({ ...form, activityEndAt: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">活动标签</label>
            <input
              type="text"
              value={form.activityLabel}
              onChange={(e) => setForm({ ...form, activityLabel: e.target.value })}
              placeholder="例如：限时免费领取基础版"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  )
}