import { useState, useCallback } from 'react'
import type { AnalysisResult } from '../types'
import { resumeApi } from '../api/resume'

/**
 * 简历分析 Hook
 * 通过后端 AI 服务分析整份简历
 */
export function useAnalysis() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 执行简历分析
   * @param resumeId 简历 ID
   */
  const analyze = useCallback(async (resumeId: number, prompt?: string) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const { data } = await resumeApi.analyze(resumeId, { prompt })
      setAnalysisResult(data.data)
    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const loadLatestAnalysis = useCallback(async (resumeId: number) => {
    setAnalysisResult(null)
    try {
      const { data } = await resumeApi.getLatestAnalysis(resumeId)
      setAnalysisResult(data.data)
    } catch (err) {
      console.error('加载最近分析结果失败:', err)
    }
  }, [])

  /**
   * 重置分析结果
   */
  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null)
    setError(null)
  }, [])

  return {
    analysisResult,
    isAnalyzing,
    analyze,
    loadLatestAnalysis,
    resetAnalysis,
    error,
  }
}
