import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useResumeStore } from '../store/resumeStore'
import { generateResumePdfBlob, type ResumePdfPageMode } from '../utils/resumePdf'

export default function ChromePreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const resumeId = Number(id)
  const { modules, loading, fetchModules } = useResumeStore()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const activeUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const refreshToken = searchParams.get('refresh') ?? ''
  const pageMode: ResumePdfPageMode = searchParams.get('pageMode') === 'continuous'
    ? 'continuous'
    : 'standard'

  useEffect(() => {
    if (!resumeId) {
      return
    }

    void fetchModules(resumeId)
  }, [fetchModules, resumeId])

  useEffect(() => {
    if (modules.length === 0) {
      setPdfUrl(null)
      setPdfLoading(false)
      setPdfError('')
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current)
        activeUrlRef.current = null
      }
      return
    }

    let cancelled = false
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setPdfLoading(true)
    setPdfError('')

    void generateResumePdfBlob(modules, { pageMode })
      .then((blob) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        const nextUrl = URL.createObjectURL(blob)
        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current)
        }
        activeUrlRef.current = nextUrl
        setPdfUrl(nextUrl)
        setPdfLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        setPdfLoading(false)
        setPdfError(error instanceof Error ? error.message : 'PDF 预览生成失败')
      })

    return () => {
      cancelled = true
    }
  }, [modules, pageMode, refreshToken])

  useEffect(() => () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current)
    }
  }, [])

  const iframeTitle = useMemo(
    () => (pageMode === 'continuous' ? 'Chrome Smart One Page PDF Preview' : 'Chrome Standard PDF Preview'),
    [pageMode]
  )

  if (loading && modules.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-400">
        正在加载简历...
      </div>
    )
  }

  if (pdfError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {pdfError}
        </div>
      </div>
    )
  }

  if (!pdfUrl || pdfLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-400">
        正在生成 PDF 预览...
      </div>
    )
  }

  return (
    <iframe
      title={iframeTitle}
      src={pdfUrl}
      className="min-h-screen w-full border-0 bg-white"
    />
  )
}
