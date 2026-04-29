export type InterviewMode = 'TARGET_POSITION' | 'DEEP_DIVE_PROJECT'

export type InterviewSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export interface InterviewSession {
  id: number
  resumeId: number
  resumeTitle?: string
  mode: InterviewMode
  targetPosition?: string
  targetYears?: string
  status: InterviewSessionStatus
  maxRounds: number
  totalScore?: number
  scoreTechnical?: number
  scoreExpression?: number
  scoreProject?: number
  evaluationSummary?: string
  createdAt: string
  completedAt?: string
}

export interface InterviewMessage {
  id: number
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

export interface ReferenceAnswer {
  question: string
  candidateAnswer: string
  referenceAnswer: string
  evaluation: string
}

export interface EvaluationResult {
  totalScore: number
  scoreTechnical: number
  scoreExpression: number
  scoreProject: number
  summary: string
  suggestions: string[]
}
  referenceAnswers?: ReferenceAnswer[]
}

export interface InterviewHistoryItem {
  id: number
  resumeTitle: string
  mode: InterviewMode
  totalScore?: number
  createdAt: string
  completedAt?: string
}

export interface SSEEvent {
  event: string
  data: Record<string, unknown>
}
