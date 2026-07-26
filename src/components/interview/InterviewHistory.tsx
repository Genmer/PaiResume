import { useEffect, useState } from 'react'
import { interviewApi } from '../../api/interview'
import type { InterviewHistoryItem } from '../../types/interview'

interface Props {
  onBack: () => void
  onViewDetail: (sessionId: number) => void
}

export function InterviewHistory({ onBack, onViewDetail }: Props) {
  const [history, setHistory] = useState<InterviewHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    interviewApi.getInterviewHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const modeLabel = (mode: string) =>
    mode === 'TARGET_POSITION' ? '目标职位' : '深挖项目'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 返回</button>
        <h2 className="text-lg font-semibold text-gray-800">面试历史</h2>
        <div />
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">加载中...</div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-400">还没有面试记录</p>
          <button onClick={onBack} className="mt-2 text-sm text-primary-600 hover:underline">
            去试试模拟面试 →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewDetail(item.id)}
              className="w-full rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-gray-900/10 transition-all hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.resumeTitle}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {modeLabel(item.mode)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.createdAt?.slice(0, 10)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {item.totalScore != null ? (
                    <>
                      <p className="text-lg font-bold text-primary-600">{item.totalScore.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">查看复盘报告 →</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">未完成</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
