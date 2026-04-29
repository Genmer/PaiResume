import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { analyticsApi } from '../api/analytics'
import { Header } from '../components/layout/Header'
import type {
  TierDistribution,
  SubscriptionTrend,
  ConversionFunnel,
  CodeStatsDetailed,
  AverageRemainingDays,
  RegistrationTrend,
} from '../types/membership'

const TIER_COLORS: Record<string, string> = {
  FREE: '#6B7280',
  LITE: '#F59E0B',
  PRO: '#3B82F6',
  MAX: '#1F2937',
}

const TIER_LABELS: Record<string, string> = {
  FREE: '免费版',
  LITE: '轻量版',
  PRO: '专业版',
  MAX: '旗舰版',
}

const CODE_STATUS_COLORS: Record<string, string> = {
  UNUSED: '#6B7280',
  USED: '#22C55E',
  DISABLED: '#EF4444',
}

const CODE_STATUS_LABELS: Record<string, string> = {
  UNUSED: '未使用',
  USED: '已使用',
  DISABLED: '已禁用',
}

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  fontSize: 13,
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: accent ?? '#111827' }}>{value}</p>
    </div>
  )
}

function PeriodToggle({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <div className="mb-2 flex gap-1">
      {[7, 30].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`rounded px-2 py-0.5 text-xs transition-colors ${
            value === d
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {d}天
        </button>
      ))}
    </div>
  )
}

function renderPieLabel(props: { name?: string; percent?: number }) {
  const { name, percent } = props
  if (!name || percent == null) return ''
  return `${name} ${(percent * 100).toFixed(0)}%`
}

export default function AnalyticsPage() {
  const [tierDist, setTierDist] = useState<TierDistribution[]>([])
  const [subTrends, setSubTrends] = useState<SubscriptionTrend[]>([])
  const [funnel, setFunnel] = useState<ConversionFunnel[]>([])
  const [codeStats, setCodeStats] = useState<CodeStatsDetailed | null>(null)
  const [avgDays, setAvgDays] = useState<AverageRemainingDays[]>([])
  const [regTrends, setRegTrends] = useState<RegistrationTrend[]>([])

  const [subDays, setSubDays] = useState(30)
  const [regDays, setRegDays] = useState(30)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tierRes, subRes, funnelRes, codeRes, avgRes, regRes] = await Promise.all([
        analyticsApi.getTierDistribution(),
        analyticsApi.getSubscriptionTrends(subDays),
        analyticsApi.getConversionFunnel(),
        analyticsApi.getCodeStats(),
        analyticsApi.getAverageRemainingDays(),
        analyticsApi.getRegistrationTrends(regDays),
      ])
      setTierDist(tierRes.data.data ?? [])
      setSubTrends(subRes.data.data ?? [])
      setFunnel(funnelRes.data.data ?? [])
      setCodeStats(codeRes.data.data ?? null)
      setAvgDays(avgRes.data.data ?? [])
      setRegTrends(regRes.data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [subDays, regDays])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const totalUsers = useMemo(() => tierDist.reduce((s, t) => s + t.count, 0), [tierDist])
  const payingUsers = useMemo(
    () => tierDist.filter((t) => t.tier !== 'FREE').reduce((s, t) => s + t.count, 0),
    [tierDist],
  )
  const codesUsed = codeStats?.used ?? 0
  const avgRemainingDisplay = useMemo(() => {
    if (avgDays.length === 0) return '—'
    const weighted = avgDays.reduce((s, d) => s + d.averageDays * d.userCount, 0)
    const total = avgDays.reduce((s, d) => s + d.userCount, 0)
    return total > 0 ? `${(weighted / total).toFixed(1)} 天` : '—'
  }, [avgDays])

  const tierPieData = useMemo(
    () => tierDist.map((t) => ({ name: TIER_LABELS[t.tier] ?? t.tier, value: t.count, tier: t.tier })),
    [tierDist],
  )

  const codePieData = useMemo(() => {
    if (!codeStats) return []
    return [
      { name: CODE_STATUS_LABELS.UNUSED, value: codeStats.unused, status: 'UNUSED' },
      { name: CODE_STATUS_LABELS.USED, value: codeStats.used, status: 'USED' },
      { name: CODE_STATUS_LABELS.DISABLED, value: codeStats.disabled, status: 'DISABLED' },
    ].filter((d) => d.value > 0)
  }, [codeStats])

  const codeByTierData = useMemo(() => {
    if (!codeStats?.byTier) return []
    return Object.entries(codeStats.byTier).map(([tier, count]) => ({
      tier: TIER_LABELS[tier] ?? tier,
      count,
      fill: TIER_COLORS[tier] ?? '#9CA3AF',
    }))
  }, [codeStats])

  const funnelData = useMemo(
    () => funnel.map((f) => ({ stage: f.stage, count: f.count })),
    [funnel],
  )

  const avgDaysData = useMemo(
    () =>
      avgDays.map((d) => ({
        tier: TIER_LABELS[d.tier] ?? d.tier,
        averageDays: Math.round(d.averageDays * 10) / 10,
        userCount: d.userCount,
        fill: TIER_COLORS[d.tier] ?? '#9CA3AF',
      })),
    [avgDays],
  )

  const regTrendData = useMemo(
    () => regTrends.map((r) => ({ date: r.date.slice(5), newUsers: r.newUsers })),
    [regTrends],
  )

  const subTrendData = useMemo(
    () => subTrends.map((s) => ({ date: s.date.slice(5), newSubscriptions: s.newSubscriptions, totalSubscriptions: s.totalSubscriptions })),
    [subTrends],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">加载中…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => void fetchAll()}
            className="mt-4 rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">订阅数据分析</h1>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="总用户数" value={totalUsers} />
          <StatCard label="付费会员" value={payingUsers} accent="#3B82F6" />
          <StatCard label="激活码已使用" value={codesUsed} accent="#22C55E" />
          <StatCard label="平均剩余天数" value={avgRemainingDisplay} accent="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="用户订阅占比">
            {tierPieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={tierPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={renderPieLabel}
                    labelLine
                  >
                    {tierPieData.map((entry) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] ?? '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="版本分布趋势">
            <PeriodToggle value={subDays} onChange={setSubDays} />
            {subTrendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={subTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Line type="monotone" dataKey="newSubscriptions" name="新增订阅" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="totalSubscriptions" name="累计订阅" stroke="#1F2937" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="新注册 vs 会员转化漏斗">
            {funnelData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="人数" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          ['#3B82F6', '#F59E0B', '#22C55E', '#1F2937'][i] ?? '#9CA3AF'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="激活码使用率">
            {codePieData.length === 0 && codeByTierData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <div className="flex flex-col gap-4">
                {codePieData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={codePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        label={renderPieLabel}
                        labelLine
                      >
                        {codePieData.map((entry) => (
                          <Cell key={entry.status} fill={CODE_STATUS_COLORS[entry.status] ?? '#9CA3AF'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {codeByTierData.length > 0 && (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={codeByTierData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="count" name="激活码数" radius={[4, 4, 0, 0]}>
                        {codeByTierData.map((entry) => (
                          <Cell key={entry.tier} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </Card>

          <Card title="新增注册趋势">
            <PeriodToggle value={regDays} onChange={setRegDays} />
            {regTrendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={regTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="newUsers" name="新增用户" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="平均剩余会员天数">
            {avgDaysData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={avgDaysData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, _name, props) => {
                      const days = typeof value === 'number' ? value : Number(value)
                      const count = (props.payload as { userCount?: number } | undefined)?.userCount ?? 0
                      return [`${days} 天 (${count} 人)`, '平均剩余']
                    }}
                  />
                  <Bar dataKey="averageDays" name="平均天数" radius={[4, 4, 0, 0]}>
                    {avgDaysData.map((entry) => (
                      <Cell key={entry.tier} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}