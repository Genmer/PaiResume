import type { EvaluationResult } from '../../types/interview'

interface Props {
  result: EvaluationResult | null
  onRetry: () => void
  onBack: () => void
}

export function InterviewReport({ result, onRetry, onBack }: Props) {
  if (!result) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">面试评分报告生成失败</p>
        <button onClick={onBack} className="mt-4 text-primary-600 hover:underline">返回</button>
      </div>
    )
  }

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-blue-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const scoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 返回模拟面试</button>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500 mb-2">综合评分</p>
        <p className={`text-6xl font-bold ${scoreColor(result.totalScore)}`}>
          {result.totalScore.toFixed(1)}
        </p>
        <p className="text-xs text-gray-400 mt-1">满分 10 分</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: '技术深度', score: result.scoreTechnical },
          { label: '表达清晰度', score: result.scoreExpression },
          { label: '项目理解', score: result.scoreProject },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500 mb-2">{item.label}</p>
            <p className={`text-2xl font-bold ${scoreColor(item.score)}`}>{item.score.toFixed(1)}</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${scoreBarColor(item.score)}`}
                style={{ width: `${item.score * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {result.summary && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-800 mb-2">评价摘要</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {result.suggestions && result.suggestions.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-800 mb-3">改进建议</h3>
          <ul className="space-y-2">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.referenceAnswers && result.referenceAnswers.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 font-semibold text-gray-800">参考答案</h3>
          <div className="space-y-4">
            {result.referenceAnswers.map((ra, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="mb-3">
                  <span className="inline-block rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    Q{i + 1}
                  </span>
                  <p className="mt-1.5 text-sm font-medium text-gray-800">{ra.question}</p>
                </div>
                {ra.candidateAnswer && (
                  <div className="mb-3 rounded bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-medium text-gray-500">你的回答</p>
                    <p className="text-sm text-gray-600">{ra.candidateAnswer}</p>
                  </div>
                )}
                <div className="mb-3 rounded bg-green-50 p-3">
                  <p className="mb-1 text-xs font-medium text-green-700">参考回答</p>
                  <p className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed">{ra.referenceAnswer}</p>
                </div>
                {ra.evaluation && (
                  <div className="rounded bg-blue-50 p-3">
                    <p className="mb-1 text-xs font-medium text-blue-700">点评</p>
                    <p className="text-sm text-blue-900">{ra.evaluation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          再试一次
        </button>
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          返回
        </button>
      </div>
    </div>
  )
}
