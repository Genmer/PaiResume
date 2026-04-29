import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client, { type ApiEnvelope } from '../api/client'
import { Header } from '../components/layout/Header'

interface ActivationCodeRecord {
  id: number
  code: string
  tier: string
  durationDays: number
  usedAt: string | null
}

interface ProfileData {
  id: number
  email: string
  nickname: string | null
  avatar: string | null
  role: number
  createdAt: string | null
  membershipStatus: string
  membershipTier: string
  membershipExpiresAt: string | null
  membershipSource: string | null
  membershipGrantedAt: string | null
  isPermanent: boolean
  remainingDays: number | null
  jdParseRemaining: number
  appMode: string
  activationCodeHistory: ActivationCodeRecord[]
}

const TIER_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; gradient: string }> = {
  FREE: { label: '免费版', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', gradient: 'from-gray-50 to-gray-100' },
  LITE: { label: '基础版', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-50 to-amber-100' },
  PRO: { label: '专业版', bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-200', gradient: 'from-primary-50 to-primary-100' },
  MAX: { label: '旗舰版', bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-700', gradient: 'from-gray-800 to-gray-900' },
}

const SOURCE_LABELS: Record<string, string> = {
  ADMIN_GRANTED: '管理员授予',
  ACTIVITY_CODE: '活动兑换',
  ACTIVITY: '活动领取',
  PAYMENT: '付费购买',
  FREE: '免费',
}

function tierLabel(tier: string) {
  return TIER_CONFIG[tier]?.label ?? tier
}

function durationLabel(days: number) {
  if (days === 0) return '永久'
  return `${days}天`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return dateStr
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await client.get<ApiEnvelope<ProfileData>>('/auth/profile')
      setProfile(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const handleStartEditNickname = () => {
    setNicknameInput(profile?.nickname ?? '')
    setEditingNickname(true)
  }

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) return
    setSavingNickname(true)
    try {
      const { data: res } = await client.put<ApiEnvelope<ProfileData>>('/auth/profile', { nickname: trimmed })
      setProfile(res.data)
      setEditingNickname(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSavingNickname(false)
    }
  }

  const handleNicknameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleSaveNickname()
    } else if (e.key === 'Escape') {
      setEditingNickname(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <span className="text-gray-500">加载中...</span>
        </div>
      </>
    )
  }

  if (error && !profile) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!profile) return null

  const tier = profile.membershipTier ?? 'FREE'
  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.FREE
  const displayName = profile.nickname || profile.email || '用户'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">用户信息</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-2xl font-bold">
                  {avatarLetter}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">昵称</div>
                    {editingNickname ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          onKeyDown={handleNicknameKeyDown}
                          maxLength={20}
                          disabled={savingNickname}
                          className="rounded-lg border border-primary-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 w-56"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveNickname()}
                          disabled={savingNickname || !nicknameInput.trim()}
                          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          {savingNickname ? '保存中...' : '保存'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNickname(false)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-gray-900">{profile.nickname || '未设置'}</span>
                        <button
                          type="button"
                          onClick={handleStartEditNickname}
                          className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          编辑
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">邮箱</div>
                    <span className="text-sm text-gray-600">{profile.email}</span>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">注册时间</div>
                    <span className="text-sm text-gray-600">{formatDate(profile.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border ${tierCfg.border} shadow-sm overflow-hidden`}>
            <div className={`px-6 py-5 border-b ${tierCfg.border} bg-gradient-to-r ${tierCfg.gradient}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">会员信息</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tierCfg.bg} ${tierCfg.text}`}>
                    {tierLabel(tier)}
                  </span>
                </div>
                {tier === 'FREE' && (
                  <Link
                    to="/pricing"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                  >
                    升级会员
                  </Link>
                )}
              </div>
            </div>
            <div className="px-6 py-5 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">会员等级</div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${tierCfg.bg} ${tierCfg.text}`}>
                    {tierLabel(tier)}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">有效期</div>
                  <span className="text-sm text-gray-900">
                    {tier === 'FREE'
                      ? '—'
                      : profile.isPermanent
                        ? '永久'
                        : profile.remainingDays != null
                          ? `${profile.remainingDays}天剩余`
                          : '—'}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">开通来源</div>
                  <span className="text-sm text-gray-900">
                    {profile.membershipSource ? (SOURCE_LABELS[profile.membershipSource] ?? profile.membershipSource) : '—'}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">JD 解析剩余次数</div>
                  <span className="text-sm text-gray-900">{profile.jdParseRemaining}</span>
                </div>
                {profile.membershipExpiresAt && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">到期时间</div>
                    <span className="text-sm text-gray-900">{formatDate(profile.membershipExpiresAt)}</span>
                  </div>
                )}
                {profile.membershipGrantedAt && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">开通时间</div>
                    <span className="text-sm text-gray-900">{formatDate(profile.membershipGrantedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">激活码使用记录</h2>
            </div>
            <div className="px-6 py-4">
              {profile.activationCodeHistory.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">暂无使用记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-3 pr-4 font-medium">激活码</th>
                        <th className="py-3 pr-4 font-medium">等级</th>
                        <th className="py-3 pr-4 font-medium">有效期</th>
                        <th className="py-3 font-medium">使用时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {profile.activationCodeHistory.map((record) => {
                        const recordTierCfg = TIER_CONFIG[record.tier] ?? TIER_CONFIG.FREE
                        return (
                          <tr key={record.id}>
                            <td className="py-3 pr-4 font-mono text-primary-700">{record.code}</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${recordTierCfg.bg} ${recordTierCfg.text}`}>
                                {tierLabel(record.tier)}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{durationLabel(record.durationDays)}</td>
                            <td className="py-3 text-gray-500">{formatDate(record.usedAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">账户统计</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-sm text-gray-500">注册时间</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">{formatDate(profile.createdAt)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                  <div className="text-sm text-gray-500">账户角色</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">
                    {profile.role === 1 ? '管理员' : '普通用户'}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}