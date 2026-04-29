import { useState } from 'react'
import { resumeApi, type AtsCheckResult } from '../../api/resume'
import { Button } from '../ui/Button'

interface AtsCheckPanelProps {
  resumeId: number
}

const BAR_COLORS = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-slate-500']

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-green-600' :
    score >= 70 ? 'text-amber-600' :
    'text-red-600'
  const strokeColor =
    score >= 90 ? '#16a34a' :
    score >= 70 ? '#d97706' :
    '#dc2626'
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className={`absolute text-xl font-bold ${color}`}>{score}</span>
    </div>
  )
}

export function AtsCheckPanel({ resumeId }: AtsCheckPanelProps) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<AtsCheckResult | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    setChecking(true)
    setError('')
    try {
      const { data: res } = await resumeApi.atsCheck(resumeId)
      setResult(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ATS 检测失败')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">ATS 兼容性检测</h2>
        <p className="text-sm text-gray-500">
          检测简历在求职者跟踪系统（ATS）中的解析兼容性，确保投递时内容能被正确识别
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        所有用户均可免费使用 ATS 兼容性检测。
      </div>

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
            <ScoreGauge score={result.overallScore} />
            <div>
              <div className="text-sm font-medium text-gray-900">ATS 兼容性评分</div>
              <div className="text-xs text-gray-500">
                {result.overallScore >= 90 ? '兼容性优秀，ATS 解析无碍' :
                 result.overallScore >= 70 ? '兼容性良好，部分维度可优化' :
                 '兼容性一般，建议针对性改进'}
              </div>
            </div>
          </div>

          {result.categories.length > 0 && (
            <div className="space-y-4">
              {result.categories.map((category, index) => (
                <div key={category.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{category.name}</span>
                    <span className="text-xs text-gray-400">{category.score}/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${BAR_COLORS[index % BAR_COLORS.length]}`}
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                  {category.issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {category.issues.map((issue, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-500">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.categories.every((c) => c.issues.length === 0) && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              所有维度均表现良好，ATS 系统可完整解析此简历。
            </div>
          )}
        </div>
      )}
    </div>
  )
}
