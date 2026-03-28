import { useRef, useCallback } from 'react'
import { useResumeStore } from '../store/resumeStore'

export function useAutoSave(resumeId: number, moduleId: number | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { updateModuleContent } = useResumeStore()

  const save = useCallback(
    (content: Record<string, unknown>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        if (moduleId) {
          updateModuleContent(resumeId, moduleId, content)
        }
      }, 1500)
    },
    [resumeId, moduleId, updateModuleContent]
  )

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { save, flush }
}
