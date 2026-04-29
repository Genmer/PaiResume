import { useState, useRef, useEffect } from 'react'
import { interviewApi } from '../../api/interview'
import type { EvaluationResult } from '../../types/interview'

interface Props {
  sessionId: number
  maxRounds: number
  onEnd: (result: EvaluationResult | null) => void
  onBack: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function InterviewChat({ sessionId, maxRounds, onEnd, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [round, setRound] = useState(0)
  const [ending, setEnding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (!sessionId || startedRef.current) return
    startedRef.current = true

    const init = async () => {
      try {
        const detail = await interviewApi.getInterviewDetail(sessionId)
        const loaded: ChatMessage[] = []
        const msgs = detail.messages ?? []
        for (const msg of msgs) {
          if (msg.role === 'USER') loaded.push({ role: 'user', content: msg.content })
          else if (msg.role === 'ASSISTANT') loaded.push({ role: 'assistant', content: msg.content })
        }
        setMessages(loaded)
        setRound(loaded.filter((m) => m.role === 'user').length)
        setLoading(false)

        if (!loaded.some((m) => m.role === 'assistant')) {
          await doSend('__START__')
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : '加载面试失败')
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const doSend = async (text: string) => {
    const isStart = text === '__START__'
    setSending(true)
    setStreamingContent('')

    if (!isStart) {
      setRound((r) => r + 1)
      setMessages((prev) => [...prev, { role: 'user', content: text }])
    }

    try {
      const controller = new AbortController()
      const aiContent = await interviewApi.sendMessage(sessionId, isStart ? '__START__' : text, {
        signal: controller.signal,
        onEvent: (event) => {
          if (event.event === 'content_delta' && event.data.content) {
            setStreamingContent((prev) => prev + (event.data.content as string))
          }
          if (event.event === 'done' && event.data.autoEnded) {
            setSending(true)  // disable input while loading report
            setTimeout(() => {
              interviewApi.endInterview(sessionId).then((result) => {
                onEnd(result)
              }).catch(() => {
                onEnd(null)
              })
            }, 500)
          }
        },
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: aiContent || '' }])
      setStreamingContent('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发送失败'
      setMessages((prev) => [...prev, { role: 'assistant', content: `[错误] ${msg}` }])
      setStreamingContent('')
    } finally {
      setSending(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    doSend(text)
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      const result = await interviewApi.endInterview(sessionId)
      onEnd(result)
    } catch {
      onEnd(null)
    } finally {
      setEnding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loadError) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500 mb-4">{loadError}</p>
        <button onClick={onBack} className="text-primary-600 hover:underline">← 返回</button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← 返回</button>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
            第 {round}/{maxRounds} 轮
          </span>
          <button
            onClick={handleEnd}
            disabled={ending}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {ending ? '结束中...' : '结束面试'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
        {loading && (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            <span className="animate-pulse">面试官正在准备中...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {streamingContent && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {streamingContent}
              <span className="inline-block w-1 animate-pulse bg-gray-400 ml-0.5">|</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的回答..."
          rows={2}
          disabled={sending || loading}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim() || loading}
          className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 self-end"
        >
          {sending ? '回复中...' : '发送'}
        </button>
      </div>
    </div>
  )
}
