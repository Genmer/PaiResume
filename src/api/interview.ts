import client, { type ApiEnvelope } from './client'
import type {
  InterviewMode,
  InterviewSession,
  InterviewMessage,
  EvaluationResult,
  InterviewHistoryItem,
  SSEEvent,
} from '../types/interview'

const STREAM_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function buildStreamApiUrl(path: string) {
  if (/^https?:\/\//.test(STREAM_API_BASE_URL)) {
    return `${STREAM_API_BASE_URL}${path}`
  }
  return `${window.location.origin}${STREAM_API_BASE_URL}${path}`
}

function parseSseChunk(chunk: string): SSEEvent | null {
  const normalized = chunk.replace(/\r/g, '').trim()
  if (!normalized) return null

  let eventName = 'status'
  const dataLines: string[] = []

  for (const line of normalized.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  const rawData = dataLines.join('\n').trim()
  if (!rawData) return { event: eventName, data: {} }

  try {
    return { event: eventName, data: JSON.parse(rawData) as Record<string, unknown> }
  } catch {
    return { event: eventName, data: { message: rawData } }
  }
}

async function extractStreamErrorMessage(response: Response) {
  const text = await response.text()
  if (!text.trim()) return `请求失败（HTTP ${response.status}）`
  try {
    const payload = JSON.parse(text) as { message?: string }
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message
  } catch {
    return text
  }
  return text
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const envelope = response.data
  if (envelope && typeof envelope.code === 'number' && envelope.code !== 200) {
    throw new Error(envelope.message || '请求失败')
  }
  return envelope.data
}

export const interviewApi = {
  getInterviewQuota: async () => {
    const result = await client.get<ApiEnvelope<{ remaining: number }>>('/interview/quota')
    return unwrap(result)
  },

  startInterview: async (request: {
    resumeId: number
    mode: InterviewMode
    targetPosition?: string
    targetYears?: string
    maxRounds?: number
  }) => {
    const result = await client.post<ApiEnvelope<InterviewSession>>('/interview/start', request)
    return unwrap(result)
  },

  sendMessage: async (
    sessionId: number,
    content: string,
    options: { signal?: AbortSignal; onEvent?: (event: SSEEvent) => void } = {}
  ) => {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(buildStreamApiUrl(`/interview/${sessionId}/chat`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal: options.signal,
    })

    if (!response.ok) {
      const message = await extractStreamErrorMessage(response)
      throw new Error(message)
    }

    if (!response.body) {
      throw new Error('浏览器未返回可读取的 AI 流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let aiContent = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const normalizedBuffer = buffer.replace(/\r\n/g, '\n')
        const chunks = normalizedBuffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const event = parseSseChunk(chunk)
          if (!event) continue

          options.onEvent?.(event)

          if (event.event === 'content_delta' && event.data.content) {
            aiContent += event.data.content as string
          }

          if (event.event === 'error') {
            const msg =
              typeof event.data.message === 'string' && event.data.message.trim()
                ? event.data.message
                : 'AI 回复失败，请稍后重试'
            throw new Error(msg as string)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return aiContent
  },

  endInterview: async (sessionId: number) => {
    const result = await client.post<ApiEnvelope<EvaluationResult>>(`/interview/${sessionId}/end`)
    return unwrap(result)
  },

  getInterviewHistory: async () => {
    const result = await client.get<ApiEnvelope<InterviewHistoryItem[]>>('/interview/history')
    return unwrap(result)
  },

  getInterviewDetail: async (sessionId: number) => {
    const result = await client.get<ApiEnvelope<{
      session: InterviewSession
      messages: InterviewMessage[]
    }>>(`/interview/${sessionId}`)
    return unwrap(result)
  },
}
