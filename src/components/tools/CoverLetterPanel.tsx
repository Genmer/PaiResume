import { useState } from 'react'
import { resumeApi, type CoverLetterResult } from '../../api/resume'
import { useMembership } from '../../hooks/useMembership'
import { Button } from '../ui/Button'
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea'

interface Props {
  resumeId: number
}

type LetterType = 'cover_letter' | 'self_intro'
type Tone = 'formal' | 'friendly'

const TYPE_OPTIONS: { value: LetterType; label: string; desc: string }[] = [
  { value: 'cover_letter', label: '✉️ 求职信', desc: '300-500 字书面求职信，适合投递附言/邮件' },
  { value: 'self_intro', label: '🎤 自我介绍', desc: '一分钟口语化自我介绍，适合面试开场' },
]

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'formal', label: '专业正式' },
  { value: 'friendly', label: '自然亲切' },
]

export function CoverLetterPanel({ resumeId }: Props) {
  const [letterType, setLetterType] = useState<LetterType>('cover_letter')
  const [tone, setTone] = useState<Tone>('formal')
  const [jdText, setJdText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<CoverLetterResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { jdParseRemaining } = useMembership()

  const handleGenerate = async () => {
    setError('')
    setGenerating(true)
    setResult(null)
    setCopied(false)
    try {
      const { data: res } = await resumeApi.coverLetter(resumeId, {
        type: letterType,
        tone,
        jdText: jdText.trim() || undefined,
      })
      if (res.code !== 200) {
        setError(res.message || '生成失败')
        return
      }
      setResult(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败，请手动选择文本复制')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">求职信 / 自我介绍</h2>
        <p className="text-sm text-gray-500">
          AI 基于你的简历生成求职信或面试自我介绍，粘贴目标岗位 JD 可以让内容更具针对性
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">生成类型</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLetterType(opt.value)}
                disabled={generating}
                className={`rounded-lg border p-3.5 text-left transition-all ${
                  letterType === opt.value
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="mt-1 text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">语气风格</label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTone(opt.value)}
                disabled={generating}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  tone === opt.value
                    ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              目标岗位 JD <span className="font-normal text-gray-400">（可选）</span>
            </label>
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
            minRows={4}
            placeholder="粘贴目标岗位 JD，生成内容将围绕岗位要求组织；留空则基于简历生成通用版本..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            disabled={generating}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => void handleGenerate()}
            loading={generating}
            disabled={generating}
            size="sm"
          >
            {letterType === 'cover_letter' ? '生成求职信' : '生成自我介绍'}
          </Button>
          {generating && (
            <span className="text-sm text-gray-500">AI 正在提炼简历亮点撰写内容，约需 20-60 秒...</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {result.type === 'cover_letter' ? '✉️ 求职信' : '🎤 自我介绍'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {copied ? '✓ 已复制' : '复制全文'}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50"
              >
                换一版
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-lg bg-gray-50 px-4 py-3.5 text-sm leading-7 text-gray-800">
            {result.content}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            内容由 AI 基于简历生成，投递前请核对信息准确性并按需调整。
          </p>
        </div>
      )}
    </div>
  )
}
