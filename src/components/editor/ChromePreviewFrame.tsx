import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RESUME_PDF_TEMPLATES,
  type ResumePdfAccentPreset,
  type ResumePdfHeadingStyle,
  type ResumePdfPageMode,
  type ResumePdfPreviewConfig,
} from '../../utils/resumePdf'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'

interface ChromePreviewFrameProps {
  resumeId: number
  config: ResumePdfPreviewConfig
  onConfigChange: (nextConfig: ResumePdfPreviewConfig) => void
  onExportPdf?: (pageMode: ResumePdfPageMode) => void
  exporting?: boolean
  exportError?: string
}

const visibleTemplates = RESUME_PDF_TEMPLATES.filter((template) => template.id !== 'compact')

const accentPresetOptions: Array<{ value: ResumePdfAccentPreset; label: string }> = [
  { value: 'auto', label: '跟随模板' },
  { value: 'blue', label: '蓝调' },
  { value: 'slate', label: '石墨' },
  { value: 'warm', label: '暖棕' },
  { value: 'emerald', label: '森绿' },
]

const headingStyleOptions: Array<{ value: ResumePdfHeadingStyle; label: string }> = [
  { value: 'auto', label: '跟随模板' },
  { value: 'underline', label: '横线标题' },
  { value: 'filled', label: '色块标题' },
  { value: 'bar', label: '侧边强调' },
]
const CHROME_PREVIEW_RESIZE_MESSAGE_TYPE = 'pai-resume:chrome-preview-resize'
const DEFAULT_STANDARD_PREVIEW_HEIGHT = 1160
const DEFAULT_CONTINUOUS_PREVIEW_HEIGHT = 760

function InlineOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (nextValue: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white p-1">
        {options.map((option) => {
          const isActive = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ChromePreviewFrame({
  resumeId,
  config,
  onConfigChange,
  onExportPdf,
  exporting = false,
  exportError = '',
}: ChromePreviewFrameProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageMode, setPageMode] = useState<ResumePdfPageMode>('standard')
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)
  const previewPath = useMemo(() => {
    const params = new URLSearchParams({
      pageMode,
      templateId: config.templateId,
      density: config.density,
      accentPreset: config.accentPreset,
      headingStyle: config.headingStyle,
      refresh: String(refreshKey),
    })

    return `/preview/${resumeId}?${params.toString()}`
  }, [config.accentPreset, config.density, config.headingStyle, config.templateId, pageMode, refreshKey, resumeId])
  const previewUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return previewPath
    }

    return new URL(previewPath, window.location.origin).toString()
  }, [previewPath])
  const effectivePreviewHeight = previewHeight ?? (
    pageMode === 'standard' ? DEFAULT_STANDARD_PREVIEW_HEIGHT : DEFAULT_CONTINUOUS_PREVIEW_HEIGHT
  )
  const updateConfig = (patch: Partial<ResumePdfPreviewConfig>) => {
    onConfigChange({
      ...config,
      ...patch,
    })
  }

  useEffect(() => {
    setPreviewHeight(null)
  }, [previewPath])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      const payload = event.data as {
        type?: string
        previewPath?: string
        height?: number
      } | null
      if (!payload || payload.type !== CHROME_PREVIEW_RESIZE_MESSAGE_TYPE || payload.previewPath !== previewPath) {
        return
      }

      if (typeof payload.height === 'number' && Number.isFinite(payload.height) && payload.height > 0) {
        setPreviewHeight(Math.ceil(payload.height))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [previewPath])

  useEffect(() => {
    const iframe = previewIframeRef.current
    if (!iframe) {
      return
    }

    let frameResizeObserver: ResizeObserver | null = null
    let nestedResizeObserver: ResizeObserver | null = null
    let mutationObserver: MutationObserver | null = null

    const updateHeightFromFrame = () => {
      const frameDocument = iframe.contentDocument
      if (!frameDocument) {
        return
      }

      const nextHeight = Math.max(
        frameDocument.body?.scrollHeight ?? 0,
        frameDocument.documentElement?.scrollHeight ?? 0
      )
      if (nextHeight > 0) {
        setPreviewHeight(nextHeight)
      }
    }

    const attachNestedObserver = () => {
      nestedResizeObserver?.disconnect()
      const nestedFrame = iframe.contentDocument?.querySelector('iframe')
      if (!nestedFrame || typeof ResizeObserver === 'undefined') {
        return
      }

      nestedResizeObserver = new ResizeObserver(() => {
        updateHeightFromFrame()
      })
      nestedResizeObserver.observe(nestedFrame)
    }

    const bindFrameObservers = () => {
      const frameDocument = iframe.contentDocument
      if (!frameDocument) {
        return
      }

      updateHeightFromFrame()
      attachNestedObserver()

      if (typeof ResizeObserver !== 'undefined') {
        frameResizeObserver?.disconnect()
        frameResizeObserver = new ResizeObserver(() => {
          updateHeightFromFrame()
          attachNestedObserver()
        })

        if (frameDocument.body) {
          frameResizeObserver.observe(frameDocument.body)
        }
        if (frameDocument.documentElement) {
          frameResizeObserver.observe(frameDocument.documentElement)
        }
      }

      mutationObserver?.disconnect()
      mutationObserver = new MutationObserver(() => {
        updateHeightFromFrame()
        attachNestedObserver()
      })
      mutationObserver.observe(frameDocument, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    }

    const handleLoad = () => {
      bindFrameObservers()
    }

    iframe.addEventListener('load', handleLoad)
    bindFrameObservers()

    return () => {
      iframe.removeEventListener('load', handleLoad)
      frameResizeObserver?.disconnect()
      nestedResizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [previewPath])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="overflow-hidden border border-slate-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)]">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPageMode('standard')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    pageMode === 'standard'
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  标准 PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPageMode('continuous')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    pageMode === 'continuous'
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  智能一页
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 overflow-hidden">
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                <span className="block truncate">{previewUrl}</span>
              </div>
              {onExportPdf && (
                <Button
                  type="button"
                  onClick={() => onExportPdf(pageMode)}
                  loading={exporting}
                  className="shrink-0"
                >
                  导出 PDF
                </Button>
              )}
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
              >
                刷新
              </button>
              <a
                href={previewPath}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
              >
                打开预览
              </a>
            </div>
          </div>
          {exportError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {exportError}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
            <InlineOptionGroup
              label="密度"
              value={config.density}
              options={[
                { value: 'normal', label: '标准' },
                { value: 'compact', label: '紧凑' },
              ]}
              onChange={(nextDensity) => updateConfig({ density: nextDensity })}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">主题色</span>
              <Select
                value={config.accentPreset}
                onValueChange={(nextValue) => updateConfig({ accentPreset: nextValue as ResumePdfAccentPreset })}
                options={accentPresetOptions}
                placeholder="选择主题色"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">标题样式</span>
              <Select
                value={config.headingStyle}
                onValueChange={(nextValue) => updateConfig({ headingStyle: nextValue as ResumePdfHeadingStyle })}
                options={headingStyleOptions}
                placeholder="选择标题样式"
                triggerClassName="min-w-[120px]"
              />
            </div>
            <div className="text-xs text-slate-400">
              这些参数会对当前选中的所有模板统一生效。
            </div>
          </div>
        </div>
        <div
          className="grid grid-cols-[300px_minmax(0,1fr)] bg-[#eef3f9]"
          style={{ minHeight: `${effectivePreviewHeight}px` }}
        >
          <aside className="border-r border-slate-200 bg-white/82 backdrop-blur">
            <div className="flex min-h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="text-sm font-semibold text-slate-900">模板视图</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  左侧切换模板，上方统一调整紧凑密度和共性主题参数，右侧实时查看效果。
                </p>
              </div>
              <div className="space-y-3 px-4 py-4">
                {visibleTemplates.map((template) => {
                  const isActive = config.templateId === template.id
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => updateConfig({ templateId: template.id })}
                      className={`w-full border-l-2 px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-l-primary-600 bg-primary-50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
                            isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {template.icon}
                          </span>
                          <span className="text-[11px] font-semibold text-primary-700">{template.name}</span>
                        </div>
                        {isActive ? (
                          <span className="rounded-sm bg-primary-600 px-2 py-0.5 text-[10px] font-medium text-white">当前</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-500">
                        {template.previewSummary}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {template.previewHighlights.map((highlight) => (
                          <span
                            key={highlight}
                            className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                              isActive
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
          <div className="p-3">
            <div className="overflow-hidden border border-slate-300 bg-white shadow-[0_20px_48px_-36px_rgba(15,23,42,0.26)]">
              <iframe
                key={previewPath}
                ref={previewIframeRef}
                title="简历模板预览"
                src={previewPath}
                scrolling="no"
                className="block w-full border-0 bg-white"
                style={{ height: `${effectivePreviewHeight}px` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
