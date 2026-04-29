import { useState, useEffect, useCallback } from 'react'
import { Header } from '../components/layout/Header'
import { useResumeStore } from '../store/resumeStore'
import { useMembership } from '../hooks/useMembership'
import { interviewApi } from '../api/interview'
import { resumeApi } from '../api/resume'
import type { InterviewMode, EvaluationResult } from '../types/interview'
import { InterviewChat } from '../components/interview/InterviewChat'
import { InterviewReport } from '../components/interview/InterviewReport'
import { InterviewHistory } from '../components/interview/InterviewHistory'

type View = 'select' | 'chat' | 'report' | 'history'

export default function InterviewPage() {
  const { resumeList, fetchResumeList } = useResumeStore()
  const { mockInterviewRemaining } = useMembership()

  const [view, setView] = useState<View>('select')
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [mode, setMode] = useState<InterviewMode>('TARGET_POSITION')
  const [targetPosition, setTargetPosition] = useState('')
  const [targetYears, setTargetYears] = useState('')
  const [maxRounds, setMaxRounds] = useState<number>(8)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)

  useEffect(() => {
    fetchResumeList()
  }, [fetchResumeList])

  const handleSelectResume = useCallback(async (resumeId: number) => {
    setSelectedResumeId(resumeId)
    try {
      const { data: envelope } = await resumeApi.getModules(resumeId)
      const modules = envelope.data ?? []
      const basicInfo = modules.find((m: { moduleType: string }) => m.moduleType === 'basic_info')
      if (basicInfo?.content) {
        const c = basicInfo.content as Record<string, unknown>
        const intention = typeof c.jobIntention === 'string' ? c.jobIntention : ''
        const years = typeof c.workYears === 'string' ? c.workYears : (typeof c.workYears === 'number' ? String(c.workYears) : '')
        if (intention) setTargetPosition(intention)
        if (years) setTargetYears(years)
      }
    } catch {
      // auto-fill is optional
    }
  }, [])

  const handleStart = async () => {
    if (!selectedResumeId) return
    setError('')
    setStarting(true)
    try {
      const result = await interviewApi.startInterview({
        resumeId: selectedResumeId,
        mode,
        targetPosition: mode === 'TARGET_POSITION' ? targetPosition : undefined,
        targetYears: mode === 'TARGET_POSITION' ? targetYears : undefined,
        maxRounds,
      })
      setSessionId(result.id)
      setView('chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : '开始面试失败')
    } finally {
      setStarting(false)
    }
  }

  const handleEndInterview = (result: typeof evaluationResult) => {
    setEvaluationResult(result)
    setView('report')
  }

  const handleRetry = () => {
    setSessionId(null)
    setEvaluationResult(null)
    setView('select')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {view === 'select' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">模拟面试</h1>
              <button
                onClick={() => setView('history')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                历史记录
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">选择简历</h2>
                <span className="text-sm text-gray-500">
                  剩余次数：<span className="font-medium text-primary-600">{mockInterviewRemaining}</span>
                </span>
              </div>
              {resumeList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-gray-500">还没有简历，请先去创建一份简历</p>
                  <a href="/dashboard" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
                    去创建简历 →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {resumeList.map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => handleSelectResume(resume.id)}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        selectedResumeId === resume.id
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900 truncate">{resume.title}</p>
                      <p className="mt-1 text-xs text-gray-400">{resume.updatedAt?.slice(0, 10)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedResumeId && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">选择面试模式</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('TARGET_POSITION')}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      mode === 'TARGET_POSITION'
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">🎯 目标职位面试</p>
                    <p className="mt-1 text-xs text-gray-500">指定岗位和年限，模拟对应级别的面试</p>
                  </button>
                  <button
                    onClick={() => setMode('DEEP_DIVE_PROJECT')}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      mode === 'DEEP_DIVE_PROJECT'
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">🔬 深挖项目面试</p>
                    <p className="mt-1 text-xs text-gray-500">围绕简历项目深度追问技术细节</p>
                  </button>
                </div>
              </div>
            )}

            {selectedResumeId && mode && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">选择面试流程</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 1, label: '⚡ 单问题问答', desc: '快速体验，一道题见分晓' },
                    { value: 3, label: '🏃 三轮短面试', desc: '精简流程，快速评估' },
                    { value: 8, label: '📝 标准八轮面试', desc: '完整流程，全面考察' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMaxRounds(opt.value)}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        maxRounds === opt.value
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedResumeId && mode === 'TARGET_POSITION' && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">目标岗位</label>
                  <input
                    type="text"
                    value={targetPosition}
                    onChange={(e) => setTargetPosition(e.target.value)}
                    placeholder="如：Java 后端开发"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">目标年限</label>
                  <select
                    value={targetYears}
                    onChange={(e) => setTargetYears(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">请选择</option>
                    <option value="1-3年">1-3 年</option>
                    <option value="3-5年">3-5 年</option>
                    <option value="5-10年">5-10 年</option>
                    <option value="10年以上">10 年以上</option>
                  </select>
                </div>
              </div>
            )}

            {selectedResumeId && (
              <button
                onClick={handleStart}
                disabled={starting || mockInterviewRemaining <= 0}
                className="w-full rounded-lg bg-primary-600 px-6 py-3 text-white font-medium transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? '正在开始...' : mockInterviewRemaining <= 0 ? '本月次数已用完' : '开始面试'}
              </button>
            )}
          </>
        )}

        {view === 'chat' && sessionId && (
          <InterviewChat
            sessionId={sessionId}
            maxRounds={maxRounds}
            onEnd={handleEndInterview}
            onBack={() => setView('select')}
          />
        )}

        {view === 'report' && (
          <InterviewReport
            result={evaluationResult}
            onRetry={handleRetry}
            onBack={() => setView('select')}
          />
        )}

        {view === 'history' && (
          <InterviewHistory
            onBack={() => setView('select')}
            onViewDetail={(id) => {
              setSessionId(id)
              setView('chat')
            }}
          />
        )}
      </main>
    </div>
  )
}
