import { useState } from 'react'
import { resumeApi, type ResumeCheckResult } from '../../api/resume'
import { useMembership } from '../../hooks/useMembership'
import { Button } from '../ui/Button'
import { PremiumGate } from '../membership/PremiumGate'

interface ErrorCheckPanelProps {
  resumeId: number
}

const SEVERITY_COLORS: Record<string, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

const SEVERITY_LABELS: Record<string, string> = {
  error: '错误',
  warning: '注意',
  info: '建议',
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-green-600' :
    score >= 70 ? 'text-amber-600' :
    'text-red-600'

  const bg =
    score >= 90 ? 'bg-green-50 border-green-200' :
    score >= 70 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'

  return (
    <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${bg}`}>
      <span className={`text-xl font-bold ${color}`}>{score}</span>
      <span className={`text-xs ${color}`}>分</span>
    </div>
  )
}

function CheckContent({ resumeId }: { resumeId: number }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ResumeCheckResult | null>(null)
  const [error, setError] = useState('')
  const { isMember } = useMembership()

  const handleCheck = async () => {
    setChecking(true)
    setError('')
    try {
      const { data: res } = await resumeApi.errorCheck(resumeId)
      setResult(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '纠错检测失败')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">简历纠错</h2>
        <p className="text-sm text-gray-500">
          AI 全面检查简历的完整性、一致性和内容质量问题
        </p>
      </div>

      {!isMember && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            免费用户仅可查看评分，升级会员可查看详细纠错报告
          </span>
        </div>
      )}

      <Button type="button" onClick={handleCheck} loading={checking}>
        开始检测
      </Button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-4">
            <ScoreCircle score={result.score} />
            <div>
              <div className="text-sm font-medium text-gray-900">综合评分</div>
              <div className="text-xs text-gray-500">
                {result.score >= 90 ? '简历质量优秀' :
                 result.score >= 70 ? '还有提升空间' :
                 '需要较多改进'}
              </div>
            </div>
          </div>

          {!result.detailed && (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              升级会员后可查看详细的纠错建议，了解每一处问题及其改进方案。
            </div>
          )}

          {result.detailed && result.issues && result.issues.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                发现 {result.issues.length} 个问题
              </h4>
              <div className="space-y-2.5">
                {result.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border px-4 py-3 ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.info}`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium uppercase">
                        {SEVERITY_LABELS[issue.severity] || issue.severity}
                      </span>
                      {issue.category && (
                        <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs">
                          {issue.category}
                        </span>
                      )}
                      {issue.field && (
                        <span className="text-xs opacity-70">{issue.field}</span>
                      )}
                    </div>
                    <p className="text-sm">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="mt-1.5 text-sm opacity-80">
                        {issue.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.detailed && (!result.issues || result.issues.length === 0) && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              未发现明显问题，简历表现良好。
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ErrorCheckPanel({ resumeId }: ErrorCheckPanelProps) {
  const { isMember } = useMembership()

  if (isMember) {
    return <CheckContent resumeId={resumeId} />
  }

  return (
    <PremiumGate
      featureName="简历纠错"
      featureDescription="付费方案内包含无限次深度 AI 纠错，逐项扫描逻辑漏洞、表达模糊与细节缺失，并给出可直接套用的改进写法——比起在面试官那里试错，提前让 AI 纠错一遍更安全。"
    >
      <CheckContent resumeId={resumeId} />
    </PremiumGate>
  )
}
