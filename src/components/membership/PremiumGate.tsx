import { type ReactNode, useState } from 'react'
import { useMembership } from '../../hooks/useMembership'
import { MembershipUpgradeModal } from './MembershipUpgradeModal'

interface PremiumGateProps {
  children: ReactNode
  featureName?: string
  featureDescription?: string
}

export function PremiumGate({
  children,
  featureName = '此功能',
  featureDescription,
}: PremiumGateProps) {
  const { isMember, loading } = useMembership()
  const [modalOpen, setModalOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (isMember) {
    return <>{children}</>
  }

  const description = featureDescription ?? `${featureName}为会员专享功能，升级会员后即可使用。`

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-200 bg-gradient-to-b from-amber-50/60 to-white px-6 py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {featureName}
        </h3>
        <p className="mb-6 max-w-md text-sm leading-6 text-gray-500">
          {description}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          升级会员
        </button>
      </div>

      <MembershipUpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
