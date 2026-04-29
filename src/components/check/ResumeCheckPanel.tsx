import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useResumeStore } from '../../store/resumeStore'
import { MembershipUpgradeModal } from '../membership/MembershipUpgradeModal'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { resumeApi, type ResumeCheckIssue, type ResumeCheckResult } from '../../api/resume'
import { checkResume, type ResumeIssue } from '../../utils/resumeCheckEngine'

interface ResumeCheckPanelProps {
  resumeId: number
}

type EffectiveIssue = {
  category: string
  severity: string
  field: string
  message: string
  suggestion: string
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'completeness':
      return (
        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'consistency':
      return (
        <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    case 'content_quality':
      return (
        <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    default:
      return (
        <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'completeness':
      return '完整性'
    case 'consistency':
      return '一致性'
    case 'content_quality':
      return '内容质量'
    default:
      return category
  }
}

function getSeverityBadge(severity: string) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

  switch (severity) {
    case 'high':
    case 'error':
      return <span className={`${base} bg-red-100 text-red-700`}>严重</span>
    case 'medium':
    case 'warning':
      return <span className={`${base} bg-yellow-100 text-yellow-700`}>中等</span>
    case 'low':
    case 'info':
      return <span className={`${base} bg-blue-100 text-blue-700`}>轻微</span>
    default:
      return <span className={`${base} bg-gray-100 text-gray-700`}>{severity}</span>
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function resolveIssueSeverity(issue: ResumeIssue | ResumeCheckIssue): string {
  if ('severity' in issue && issue.severity) return issue.severity
  return 'info'
}

function getSuggestion(issue: ResumeIssue | ResumeCheckIssue): string {
  if ('suggestion' in issue && (issue as ResumeCheckIssue).suggestion) {
    return (issue as ResumeCheckIssue).suggestion
  }
  return ''
}

export function ResumeCheckPanel({ resumeId }: ResumeCheckPanelProps) {
  const user = useAuthStore((state) => state.user)
  const isMember = user?.membershipStatus === 'ACTIVE'
  const modules = useResumeStore((state) => state.modules)

  const [result, setResult] = useState<ResumeCheckResult | null>(null)
  const [localResult, setLocalResult] = useState<{ summary: { errors: number; warnings: number; info: number }; issues: ResumeIssue[] } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [membershipModalOpen, setMembershipModalOpen] = useState(false)

  useEffect(() => {
    void performCheck()
  }, [resumeId])

  const performCheck = async () => {
    setIsChecking(true)
    setError(null)

    if (modules.length > 0) {
      const local = checkResume(modules)
      setLocalResult(local)
    }

    try {
      const { data } = await resumeApi.errorCheck(resumeId)
      setResult(data.data)
    } catch (err) {
      console.error('简历检测失败:', err)
      setError(err instanceof Error ? err.message : '检测失败，请重试')
    } finally {
      setIsChecking(false)
    }
  }

  const effectiveIssues = useMemo<EffectiveIssue[]>(() => {
    if (result?.issues && result.issues.length > 0) {
      return result.issues.map((i) => ({
        category: i.category,
        severity: i.severity,
        field: i.field,
        message: i.message,
        suggestion: i.suggestion,
      }))
    }

    if (localResult?.issues) {
      return localResult.issues.map((i) => ({
        category: i.category || 'completeness',
        severity: resolveIssueSeverity(i),
        field: i.field || '',
        message: i.message,
        suggestion: getSuggestion(i),
      }))
    }

    return []
  }, [result, localResult])

  const summary = useMemo(() => {
    if (result) {
      const issues = result.issues || []
      return {
        total: issues.length,
        errors: issues.filter((i) => i.severity === 'high').length,
        warnings: issues.filter((i) => i.severity === 'medium').length,
        info: issues.filter((i) => i.severity === 'low').length,
      }
    }
    if (localResult) {
      return {
        total: localResult.issues.length,
        errors: localResult.summary.errors,
        warnings: localResult.summary.warnings,
        info: localResult.summary.info,
      }
    }
    return { total: 0, errors: 0, warnings: 0, info: 0 }
  }, [result, localResult])

  const score = result?.score ?? 0
  const hasResult = result != null || localResult != null
  const showDetailed = isMember && (result?.detailed !== false) && effectiveIssues.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">简历纠错检测</h2>
          <p className="mt-1 text-sm text-gray-500">
            全面审核简历的完整性、一致性和内容质量
          </p>
        </div>

        <Button onClick={performCheck} loading={isChecking}>
          开始检测
        </Button>

        {error && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {hasResult && (
        <>
          <Section title="" description="">
            <div className="text-center">
              <div className={`mb-2 text-6xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className="mb-4 text-lg text-gray-600">
                综合评分
              </div>
              <div className="mb-6 h-3 w-full rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    score >= 80
                      ? 'bg-green-500'
                      : score >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>

              <div className="mb-6 flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-xs text-gray-500">严重</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
                  <div className="text-xs text-gray-500">中等</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
                  <div className="text-xs text-gray-500">轻微</div>
                </div>
              </div>

              <Button onClick={performCheck} loading={isChecking} variant="outline">
                重新检测
              </Button>
            </div>
          </Section>

          {showDetailed && (
            <Section
              title={`详细报告 (${effectiveIssues.length} 项问题)`}
              description="以下是对简历内容的全面审核结果，按严重程度排序。"
            >
              <div className="space-y-3">
                {effectiveIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border-l-4 p-4 ${
                      issue.severity === 'high' || issue.severity === 'error'
                        ? 'border-red-500 bg-red-50'
                        : issue.severity === 'medium' || issue.severity === 'warning'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        {getCategoryIcon(issue.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {getSeverityBadge(issue.severity)}
                          <span className="text-xs text-gray-400">
                            {getCategoryLabel(issue.category)}
                          </span>
                          {issue.field && (
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {issue.field}
                            </code>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">
                            {issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!isMember && hasResult && (
            <Section title="" description="">
              <div className="rounded-xl border border-dashed border-primary-200 bg-gradient-to-br from-primary-50/60 to-white p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                  <svg className="h-7 w-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="mb-1 text-lg font-semibold text-gray-900">
                  升级会员查看详细报告
                </p>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">
                  免费版仅展示评分和问题数量。升级会员后可查看每一条问题的详细说明和修改建议。
                </p>
                <Button onClick={() => setMembershipModalOpen(true)}>
                  查看会员方案
                </Button>
              </div>
            </Section>
          )}

          {isMember && result?.detailed !== false && effectiveIssues.length === 0 && (
            <Section title="" description="">
              <div className="py-8 text-center">
                <svg className="mx-auto mb-4 h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900">简历非常完善</p>
                <p className="mt-2 text-gray-600">没有发现明显问题</p>
              </div>
            </Section>
          )}
        </>
      )}

      <MembershipUpgradeModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
      />
    </div>
  )
}
