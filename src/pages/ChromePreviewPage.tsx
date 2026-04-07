import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PreviewPanel } from '../components/editor/PreviewPanel'
import { useResumeStore } from '../store/resumeStore'

export default function ChromePreviewPage() {
  const { id } = useParams<{ id: string }>()
  const resumeId = Number(id)
  const { modules, loading, fetchModules } = useResumeStore()

  useEffect(() => {
    if (!resumeId) {
      return
    }

    void fetchModules(resumeId)
  }, [fetchModules, resumeId])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eef3f9_0%,_#f7f9fc_100%)] p-6">
      <div className="mx-auto max-w-5xl">
        <PreviewPanel modules={modules} loading={loading} forcedMode="live" hideHeader />
      </div>
    </div>
  )
}
