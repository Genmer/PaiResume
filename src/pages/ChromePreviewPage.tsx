import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useResumeStore } from '../store/resumeStore'
import {
  generateResumePdfPreviewAsset,
  type ResumePdfPreviewMeta,
  resolveResumePdfAccentPreset,
  resolveResumePdfDensity,
  resolveResumePdfHeadingStyle,
  resolveResumePdfTemplateId,
  type ResumePdfAccentPreset,
  type ResumePdfDensity,
  type ResumePdfHeadingStyle,
  type ResumePdfPageMode,
  type ResumePdfTemplateId,
} from '../utils/resumePdf'

const CHROME_PREVIEW_RESIZE_MESSAGE_TYPE = 'pai-resume:chrome-preview-resize'
const STANDARD_PAGE_GAP_PX = 24
const PREVIEW_VERTICAL_BUFFER_PX = 32
const FALLBACK_STANDARD_PREVIEW_HEIGHT_PX = 1160
const FALLBACK_CONTINUOUS_PREVIEW_HEIGHT_PX = 760

export default function ChromePreviewPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const resumeId = Number(id)
  const { modules, loading, fetchModules } = useResumeStore()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewMeta, setPreviewMeta] = useState<ResumePdfPreviewMeta | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [containerWidth, setContainerWidth] = useState(0)
  const activeUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const reportedHeightRef = useRef(0)
  const refreshToken = searchParams.get('refresh') ?? ''
  const pageMode: ResumePdfPageMode = searchParams.get('pageMode') === 'continuous'
    ? 'continuous'
    : 'standard'
  const templateId: ResumePdfTemplateId = resolveResumePdfTemplateId(searchParams.get('templateId'))
  const densityParam = searchParams.get('density')
  const accentPresetParam = searchParams.get('accentPreset')
  const headingStyleParam = searchParams.get('headingStyle')
  const density: ResumePdfDensity | undefined = densityParam ? resolveResumePdfDensity(densityParam) : undefined
  const accentPreset: ResumePdfAccentPreset | undefined = accentPresetParam ? resolveResumePdfAccentPreset(accentPresetParam) : undefined
  const headingStyle: ResumePdfHeadingStyle | undefined = headingStyleParam ? resolveResumePdfHeadingStyle(headingStyleParam) : undefined

  useEffect(() => {
    if (!resumeId) {
      return
    }

    void fetchModules(resumeId)
  }, [fetchModules, resumeId])

  useEffect(() => {
    if (modules.length === 0) {
      setPdfUrl(null)
      setPreviewMeta(null)
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

    void generateResumePdfPreviewAsset(modules, { pageMode, templateId, density, accentPreset, headingStyle })
      .then(({ blob, previewMeta }) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        const nextUrl = URL.createObjectURL(blob)
        if (activeUrlRef.current) {
          URL.revokeObjectURL(activeUrlRef.current)
        }
        activeUrlRef.current = nextUrl
        setPdfUrl(nextUrl)
        setPreviewMeta(previewMeta)
        setPdfLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        setPreviewMeta(null)
        setPdfLoading(false)
        setPdfError(error instanceof Error ? error.message : 'PDF 预览生成失败')
      })

    return () => {
      cancelled = true
    }
  }, [accentPreset, density, headingStyle, modules, pageMode, refreshToken, templateId])

  useEffect(() => () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current)
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      setContainerWidth(Math.floor(entry.contentRect.width))
    })

    observer.observe(element)
    setContainerWidth(Math.floor(element.getBoundingClientRect().width))

    return () => observer.disconnect()
  }, [])

  const iframeTitle = useMemo(
    () => (pageMode === 'continuous' ? '简历模板预览 - 智能一页' : '简历模板预览 - 标准 PDF'),
    [pageMode]
  )
  const previewPath = useMemo(
    () => `${window.location.pathname}${window.location.search}`,
    []
  )
  const pdfViewerUrl = useMemo(() => {
    if (!pdfUrl) {
      return null
    }

    return `${pdfUrl}#view=FitH`
  }, [pdfUrl])
  const previewHeight = useMemo(() => {
    if (!previewMeta) {
      return pageMode === 'standard'
        ? FALLBACK_STANDARD_PREVIEW_HEIGHT_PX
        : FALLBACK_CONTINUOUS_PREVIEW_HEIGHT_PX
    }

    const effectiveContainerWidth = containerWidth > 0 ? containerWidth : window.innerWidth
    const effectivePageWidth = previewMeta.pageWidth > 0 ? previewMeta.pageWidth : 595.28
    const scaledPageHeights = previewMeta.pageHeights.map((pageHeight) => (
      effectiveContainerWidth * pageHeight / effectivePageWidth
    ))
    const totalPageHeight = scaledPageHeights.reduce((sum, pageHeight) => sum + pageHeight, 0)
    const pageGap = pageMode === 'standard' && previewMeta.pageCount > 1
      ? STANDARD_PAGE_GAP_PX * (previewMeta.pageCount - 1)
      : 0

    return Math.ceil(totalPageHeight + pageGap + PREVIEW_VERTICAL_BUFFER_PX)
  }, [containerWidth, pageMode, previewMeta])

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) {
      return
    }

    const nextHeight = Math.max(previewHeight, 520)
    if (reportedHeightRef.current === nextHeight) {
      return
    }

    reportedHeightRef.current = nextHeight
    window.parent.postMessage({
      type: CHROME_PREVIEW_RESIZE_MESSAGE_TYPE,
      previewPath,
      height: nextHeight,
    }, window.location.origin)
  }, [previewHeight, previewPath])

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
        正在生成模板预览...
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden bg-white">
      <iframe
        title={iframeTitle}
        src={pdfViewerUrl ?? undefined}
        scrolling="no"
        className="block w-full border-0 bg-white"
        style={{ height: `${previewHeight}px` }}
      />
    </div>
  )
}
