import { useState } from 'react'
import { resumeApi, type JdMatchResult } from '../../api/resume'
import { useMembership } from '../../hooks/useMembership'
import { MODULE_LABELS, type ModuleType } from '../../types'
import { Button } from '../ui/Button'
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea'

interface Props {
  resumeId: number
}

function MatchScoreCircle({ score }: { score: number }) {
  const color =
    score >= 85 ? 'text-green-600' :
    score >= 70 ? 'text-blue-600' :
    score >= 50 ? 'text-amber-600' :
    'text-red-600'

  const bg =
    score >= 85 ? 'bg-green-50 border-green-200' :
    score >= 70 ? 'bg-blue-50 border-blue-200' :
    score >= 50 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'

  return (
    <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 ${bg}`}>
      <span className={`text-xl font-bold ${color}`}>{score}</span>
      <span className={`text-xs ${color}`}>分</span>
    </div>
  )
}

function scoreDescription(score: number) {
  if (score >= 85) return '高度匹配，可直接投递'
  if (score >= 70) return '匹配较好，仍有小差距'
  if (score >= 50) return '有明显差距，建议针对性补充'
  return '匹配度较低，需要重点调整'
}

function moduleLabel(module: string) {
  return MODULE_LABELS[module as ModuleType] ?? module
}

export function JdMatchPanel({ resumeId }: Props) {
  const [jdText, setJdText] = useState('')
  const [matching, setMatching] = useState(false)
  const [result, setResult] = useState<JdMatchResult | null>(null)
  const [error, setError] = useState('')
  const { isMember, jdParseRemaining } = useMembership()

  const handleMatch = async () => {
    if (!jdText.trim()) return
    setError('')
    setMatching(true)
    setResult(null)
    try {
      const { data: res } = await resumeApi.jdMatch(resumeId, jdText.trim())
      if (res.code !== 200) {
        setError(res.message || '匹配分析失败')
        return
      }
      setResult(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '匹配分析失败，请稍后重试')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">JD 匹配度分析</h2>
        <p className="text-sm text-gray-500">
          粘贴目标岗位 JD，AI 对比你的简历给出匹配分、技能差距和针对性修改建议
        </p>
      </div>

      {!isMember && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>免费用户仅可查看匹配分与概要，升级会员可查看技能差距清单和修改建议</span>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-900/10">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">JD 文本</label>
          {jdParseRemaining !== -1 && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              jdParseRemaining <= 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {jdParseRemaining <= 0 ? '本月次数已用完' : `本月剩余 ${jdParseRemaining} 次（与 JD 解析共享）`}
            </span>
          )}
        </div>
        <AutoResizeTextarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          minRows={6}
          placeholder="粘贴职位描述（JD）文本，AI 将对比你的简历，评估匹配程度..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          disabled={matching}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button
            onClick={() => void handleMatch()}
            loading={matching}
            disabled={!jdText.trim() || matching}
            size="sm"
          >
            开始匹配分析
          </Button>
          {matching && (
            <span className="text-sm text-gray-500">AI 正在对比 JD 与简历，约需 20-60 秒...</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-2xl bg-white p-6 space-y-5 shadow-card ring-1 ring-gray-900/10">
          <div className="flex items-center gap-4">
            <MatchScoreCircle score={result.matchScore} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                匹配度 · {scoreDescription(result.matchScore)}
              </div>
              {result.summary && (
                <p className="mt-1 text-sm leading-6 text-gray-600">{result.summary}</p>
              )}
            </div>
          </div>

          {!result.detailed && (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              升级会员后可查看已匹配/缺失技能清单，以及逐模块的针对性修改建议。
            </div>
          )}

          {result.detailed && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-green-100 bg-green-50/50 p-4">
                <h4 className="mb-2.5 text-sm font-medium text-green-800">
                  ✓ 已覆盖技能（{result.matchedSkills.length}）
                </h4>
                {result.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedSkills.map((skill, i) => (
                      <span key={i} className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">暂未识别到已覆盖的技能</p>
                )}
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                <h4 className="mb-2.5 text-sm font-medium text-red-800">
                  ✗ 缺失/不足技能（{result.missingSkills.length}）
                </h4>
                {result.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingSkills.map((skill, i) => (
                      <span key={i} className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">未发现明显缺失，覆盖良好</p>
                )}
              </div>
            </div>
          )}

          {result.detailed && result.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                针对性修改建议（{result.suggestions.length}）
              </h4>
              <div className="space-y-2.5">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="mb-1">
                      <span className="rounded bg-white/70 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        {moduleLabel(suggestion.module)}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-blue-900">{suggestion.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.detailed && result.suggestions.length === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              简历与该岗位匹配良好，无需大幅调整。
            </div>
          )}
        </div>
      )}
    </div>
  )
}
