import { useState } from 'react'
import { resumeApi, type ResumeCheckResult } from '../../api/resume'
import { Button } from '../ui/Button'

const CATEGORY_LABELS: Record<string, string> = {
  completeness: '完整性',
  consistency: '一致性',
  content_quality: '内容质量',
}

const SEVERITY_LABELS: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
}

interface Props {
  resumeId: number
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreRingColor(score: number) {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  return '#dc2626'
}

function getScoreBgColor(score: number) {
  if (score >= 80) return 'bg-green-600'
  if (score >= 60) return 'bg-yellow-600'
  return 'bg-red-600'
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'high':
      return { bg: 'bg-red-100', text: 'text-red-700' }
    case 'medium':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
    case 'low':
      return { bg: 'bg-blue-100', text: 'text-blue-700' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700' }
  }
}

function getSeverityBorder(severity: string) {
  switch (severity) {
    case 'high':
      return 'border-l-red-500'
    case 'medium':
      return 'border-l-yellow-500'
    case 'low':
      return 'border-l-blue-400'
    default:
      return 'border-l-gray-300'
  }
}

function getCategoryScore(issues: ResumeCheckResult['issues']) {
  if (issues.length === 0) return 100
  let score = 100
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 20
        break
      case 'medium':
        score -= 10
        break
      case 'low':
        score -= 5
        break
    }
  }
  return Math.max(0, score)
}

export function AtsCheckPanel({ resumeId }: Props) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ResumeCheckResult | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    setError('')
    setChecking(true)
    setResult(null)
    try {
      const { data: res } = await resumeApi.errorCheck(resumeId)
      if (res.code !== 200) {
        setError(res.message || '检测失败')
        return
      }
      setResult(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '检测失败，请稍后重试')
    } finally {
      setChecking(false)
    }
  }

  const categoryMap = new Map<string, ResumeCheckResult['issues']>()
  if (result?.issues) {
    for (const issue of result.issues) {
      const list = categoryMap.get(issue.category) || []
      list.push(issue)
      categoryMap.set(issue.category, list)
    }
  }

  const score = result?.score ?? 0
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = score / 100
  const strokeDashoffset = circumference * (1 - progress)
  const ringColor = getScoreRingColor(score)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">ATS 简历检测</h2>
        <p className="mt-1 text-sm text-gray-500">
          检测简历在招聘系统中的关键指标，帮助提高通过率
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {checking && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm text-gray-500">AI 正在逐项审核简历内容...</p>
            <p className="mt-1 text-xs text-gray-400">预计需要 10-30 秒</p>
          </div>
        </div>
      )}

      {!result && !checking && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="py-8 text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-gray-500">点击下方按钮开始 ATS 检测</p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => void handleCheck()} loading={checking}>
              开始检测
            </Button>
          </div>
        </div>
      )}

      {result && !checking && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col items-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                  <span className="text-xs text-gray-400">分</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {score >= 80
                  ? '简历通过率较高，整体质量良好'
                  : score >= 60
                    ? '简历仍有优化空间，部分模块需要调整'
                    : '简历需要较多改进，建议逐一检查问题'}
              </p>
            </div>
          </div>

          {categoryMap.size > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">分类得分</h3>
              <div className="space-y-3">
                {Array.from(categoryMap.entries()).map(([category, categoryIssues]) => {
                  const catScore = getCategoryScore(categoryIssues)
                  const label = CATEGORY_LABELS[category] || category
                  const keyIssues = categoryIssues.slice(0, 3)

                  return (
                    <div
                      key={category}
                      className="rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {label}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                              catScore >= 80
                                ? 'bg-green-100 text-green-700'
                                : catScore >= 60
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {catScore}分
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {categoryIssues.length} 个问题
                        </span>
                      </div>

                      <div className="mb-3 h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${getScoreBgColor(catScore)}`}
                          style={{ width: `${catScore}%` }}
                        />
                      </div>

                      {keyIssues.length > 0 && (
                        <div className="space-y-2">
                          {keyIssues.map((issue, index) => (
                            <div
                              key={index}
                              className={`rounded-md border-l-4 bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-inset ring-gray-200/60 ${getSeverityBorder(issue.severity)}`}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getSeverityBadge(issue.severity).bg} ${getSeverityBadge(issue.severity).text}`}>
                                  {SEVERITY_LABELS[issue.severity] || issue.severity}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {issue.field}
                                </span>
                              </div>
                              <p className="text-gray-700">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="mt-1 text-xs text-gray-500">
                                  建议：{issue.suggestion}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {categoryIssues.length > 3 && (
                        <p className="mt-2 text-xs text-gray-400">
                          ...还有 {categoryIssues.length - 3} 个问题
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => void handleCheck()}
              loading={checking}
              variant="outline"
              size="sm"
            >
              重新检测
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
