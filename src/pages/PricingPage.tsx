import { useRef, useState, useEffect, useCallback } from 'react'
import { membershipApi } from '../api/membership'
import { useMembership } from '../hooks/useMembership'
import { useAuthStore } from '../store/authStore'
import { pricingPlans } from '../data/pricingPlans'
import { Header } from '../components/layout/Header'
import type { MembershipTier, ActivityConfig } from '../types/membership'

const TIER_ORDER: MembershipTier[] = ['FREE', 'LITE', 'PRO', 'MAX']

function tierRank(tier: MembershipTier): number {
  return TIER_ORDER.indexOf(tier)
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function DashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

const tierStyles: Record<MembershipTier, { card: string; badge?: string; badgeBg?: string; badgeText?: string; button: string }> = {
  FREE: {
    card: 'bg-white border-gray-200',
    button: 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400',
  },
  LITE: {
    card: 'bg-white border-amber-200',
    badge: '限时免费',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    badgeText: 'text-white',
    button: 'border border-amber-400 text-amber-700 hover:bg-amber-50',
  },
  PRO: {
    card: 'bg-white border-primary-500 ring-2 ring-primary-100 shadow-lg shadow-primary-500/10',
    badge: '最受欢迎',
    badgeBg: 'bg-gradient-to-r from-primary-500 to-blue-600',
    badgeText: 'text-white',
    button: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20',
  },
  MAX: {
    card: 'bg-gradient-to-b from-gray-900 to-gray-800 border-gray-700',
    button: 'bg-white text-gray-900 hover:bg-gray-100 shadow-sm',
  },
}

const tierNameColors: Record<MembershipTier, string> = {
  FREE: 'text-gray-900',
  LITE: 'text-amber-700',
  PRO: 'text-primary-600',
  MAX: 'text-white',
}

const tierPriceColors: Record<MembershipTier, string> = {
  FREE: 'text-gray-900',
  LITE: 'text-amber-700',
  PRO: 'text-primary-600',
  MAX: 'text-white',
}

const tierDescColors: Record<MembershipTier, string> = {
  FREE: 'text-gray-500',
  LITE: 'text-amber-600',
  PRO: 'text-primary-500',
  MAX: 'text-gray-400',
}

const featureColors: Record<MembershipTier, { text: string; icon: string }> = {
  FREE: { text: 'text-gray-600', icon: 'text-gray-400' },
  LITE: { text: 'text-gray-700', icon: 'text-amber-500' },
  PRO: { text: 'text-gray-700', icon: 'text-primary-500' },
  MAX: { text: 'text-gray-300', icon: 'text-gray-400' },
}

export default function PricingPage() {
  const contactRef = useRef<HTMLDivElement>(null)
  const { membershipTier, refresh } = useMembership()
  const { isAuthenticated } = useAuthStore()

  const [activityInfo, setActivityInfo] = useState<ActivityConfig | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  const [redeemCode, setRedeemCode] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: res } = await membershipApi.getActivity()
        if (!cancelled && res?.data) {
          const info = res.data as unknown as Record<string, unknown>
          // Backend returns ActivityActiveInfo { tier, label, durationDays } when active
          // Only set activity info if tier is present (activity is active)
          if (typeof info.tier === 'string' && info.tier) {
            setActivityInfo({
              activityTier: info.tier,
              activityEnabled: true,
              activityDurationDays: (info.durationDays as number) ?? null,
              activityStartAt: null,
              activityEndAt: null,
              activityLabel: (info.label as string) ?? null,
            } as ActivityConfig)
          }
        }
      } catch {
        setActivityInfo(null)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isActivityActive = activityInfo?.activityEnabled && activityInfo?.activityTier
  const activityTier = isActivityActive ? activityInfo!.activityTier as MembershipTier : null

  const userHasActivityTierOrHigher = activityTier
    ? tierRank(membershipTier) >= tierRank(activityTier)
    : false

  const handleActivityRedeem = useCallback(async () => {
    if (!isAuthenticated) {
      setRedeemMessage({ type: 'error', text: '请先登录后再领取' })
      return
    }
    if (activityLoading) return
    setActivityLoading(true)
    try {
      const response = await membershipApi.activityRedeem()
      const activationCode = (response.data?.data as unknown as Record<string, unknown>)?.activationCode as string | undefined
      await refresh()
      let successMsg = '领取成功！已激活会员权益'
      if (activationCode) {
        successMsg = `领取成功！激活码：${activationCode} · 已自动激活`
      }
      setRedeemMessage({ type: 'success', text: successMsg })
    } catch (err) {
      let msg = err instanceof Error ? err.message : '领取失败，请稍后重试'
      if (msg.includes('您已领取过该活动福利')) {
        msg = '您已领取过该活动福利，每个账号仅限领取一次'
      }
      setRedeemMessage({ type: 'error', text: msg })
    } finally {
      setActivityLoading(false)
    }
  }, [isAuthenticated, activityLoading, refresh])

  const handleRedeemCode = useCallback(async () => {
    const code = redeemCode.trim()
    if (!code) {
      setRedeemMessage({ type: 'error', text: '请输入激活码' })
      return
    }
    if (redeemLoading) return
    setRedeemLoading(true)
    setRedeemMessage(null)
    try {
      await membershipApi.redeemCode(code)
      await refresh()
      setRedeemMessage({ type: 'success', text: '兑换成功！会员已激活' })
      setRedeemCode('')
    } catch (err) {
      let msg = '网络错误，请稍后重试'
      if (err instanceof Error) {
        const m = err.message
        if (m.includes('无效') || m.includes('不存在')) msg = '激活码无效或已使用'
        else if (m.includes('已使用') || m.includes('已过期')) msg = '激活码已被使用'
        else if (m.includes('更高') || m.includes('等级')) msg = '您当前订阅等级更高'
        else msg = m
      }
      setRedeemMessage({ type: 'error', text: msg })
    } finally {
      setRedeemLoading(false)
    }
  }, [redeemCode, redeemLoading, refresh])

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-gray-50 pt-16 pb-12 sm:pt-20 sm:pb-16">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            选择最适合你的方案
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            所有套餐均可使用 AI 简历优化功能，按需选择
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 -mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4">
          {pricingPlans.map((plan) => {
            const styles = tierStyles[plan.tier]
            const nameColor = tierNameColors[plan.tier]
            const priceColor = tierPriceColors[plan.tier]
            const descColor = tierDescColors[plan.tier]
            const featColors = featureColors[plan.tier]
            const isMax = plan.tier === 'MAX'
            const isCurrentPlan = membershipTier === plan.tier
            const isActivityTier = activityTier === plan.tier
            const showActivityCta = isActivityActive && isActivityTier && !userHasActivityTierOrHigher && !isCurrentPlan

            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col border rounded-md p-6 transition-shadow hover:shadow-md ${styles.card} ${isCurrentPlan ? 'ring-2 ring-green-500 border-green-500' : ''}`}
              >
                {isCurrentPlan && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-0.5 text-xs font-semibold tracking-wide bg-green-500 text-white rounded-sm shadow-sm">
                    当前方案
                  </span>
                )}
                {!isCurrentPlan && plan.badge && styles.badgeBg && isActivityTier && (
                  <span
                    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-0.5 text-xs font-semibold tracking-wide ${styles.badgeBg} ${styles.badgeText} rounded-sm shadow-sm`}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3 className={`text-base font-semibold ${nameColor}`}>
                  {plan.displayName}
                </h3>

                <p className={`mt-1 text-sm ${descColor}`}>
                  {plan.description}
                </p>

                <div className="mt-5 mb-6">
                  {plan.price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold tracking-tight ${priceColor}`}>
                        ¥0
                      </span>
                      <span className={`text-sm ${isMax ? 'text-gray-500' : 'text-gray-400'}`}>
                        /{plan.priceUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold tracking-tight ${priceColor}`}>
                        ¥{plan.price}
                      </span>
                      <span className={`text-sm ${isMax ? 'text-gray-500' : 'text-gray-400'}`}>
                        /{plan.priceUnit}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`border-t ${isMax ? 'border-gray-700' : 'border-gray-100'} mb-5`} />

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckIcon className={`h-4 w-4 shrink-0 mt-0.5 ${featColors.icon}`} />
                      <span className={`text-sm leading-snug ${featColors.text}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {showActivityCta ? (
                  <button
                    onClick={handleActivityRedeem}
                    disabled={activityLoading}
                    className="w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-150 bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-600/20 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {activityLoading ? '领取中…' : (activityInfo?.activityLabel || '立即领取')}
                  </button>
                ) : (
                  <button
                    onClick={scrollToContact}
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-150 ${isCurrentPlan ? 'bg-green-100 text-green-700 cursor-default' : styles.button}`}
                  >
                    {isCurrentPlan ? '当前方案' : plan.ctaText}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Redeem code section */}
      {!isActivityActive && (
        <section className="mx-auto max-w-xl px-4 pb-16">
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">激活码兑换</h3>
            <p className="text-sm text-gray-500 mb-4">
              当前未接入支付系统，请联系管理员获取激活码
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => { setRedeemCode(e.target.value); setRedeemMessage(null) }}
                placeholder="请输入激活码"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              />
              <button
                onClick={handleRedeemCode}
                disabled={redeemLoading || !redeemCode.trim()}
                className="px-5 py-2 rounded-md text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {redeemLoading ? '兑换中…' : '兑换'}
              </button>
            </div>
            {redeemMessage && (
              <p className={`mt-3 text-sm ${redeemMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {redeemMessage.type === 'success' ? '✓ ' : '✕ '}
                {redeemMessage.text}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Activity redeem feedback */}
      {isActivityActive && redeemMessage && (
        <section className="mx-auto max-w-xl px-4 pb-8">
          <p className={`text-sm text-center ${redeemMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {redeemMessage.type === 'success' ? '✓ ' : '✕ '}
            {redeemMessage.text}
          </p>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <DashIcon className="h-4 w-4" />
            <span className="text-sm">
              所有方案均包含基础简历编辑和实时预览功能，PDF 导出为会员专属功能
            </span>
            <DashIcon className="h-4 w-4" />
          </div>
        </div>
      </section>

      <section ref={contactRef} className="bg-gray-900 text-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            需要帮助？
          </h2>
          <p className="mt-3 text-gray-400 text-base">
            如有任何疑问或需要定制方案，欢迎联系我们
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="bg-gray-800 border border-gray-700 rounded-md p-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584l-.001-.031m0 0a3 3 0 01-4.682-2.72 9.094 9.094 0 003.741.479M12 12a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                <span className="text-sm font-semibold text-gray-200">QQ 群</span>
              </div>
              <p className="text-lg font-mono text-white">123456789</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-md p-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-semibold text-gray-200">微信号</span>
              </div>
              <p className="text-lg font-mono text-white">PaiResume</p>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-500">
            工作时间：周一至周五 9:00 - 18:00
          </p>
        </div>
      </section>

      <footer className="bg-gray-950 text-gray-500 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs">
          <p>© {new Date().getFullYear()} 咕咕嘎嘎简历 · 让每一份简历都值得被看见</p>
        </div>
      </footer>
    </div>
  )
}