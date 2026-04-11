import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RESUME_PDF_TEMPLATES,
  type ResumePdfAccentPreset,
  type ResumePdfHeadingStyle,
  type ResumePdfPageMode,
  type ResumePdfPreviewConfig,
  type ResumePdfTemplateId,
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

interface TemplatePreviewTone {
  panelClassName: string
  headerClassName: string
  titleBarClassName: string
  highlightClassName: string
  lineClassName: string
  chipClassName: string
}

const TEMPLATE_PREVIEW_TONES: Record<Exclude<ResumePdfTemplateId, 'compact'>, TemplatePreviewTone> = {
  default: {
    panelClassName: 'bg-white',
    headerClassName: 'bg-slate-100',
    titleBarClassName: 'bg-slate-300',
    highlightClassName: 'bg-primary-300',
    lineClassName: 'bg-slate-200',
    chipClassName: 'bg-slate-100',
  },
  accent: {
    panelClassName: 'bg-blue-50',
    headerClassName: 'bg-blue-100',
    titleBarClassName: 'bg-blue-600',
    highlightClassName: 'bg-blue-500',
    lineClassName: 'bg-blue-200',
    chipClassName: 'bg-blue-100',
  },
  minimal: {
    panelClassName: 'bg-white',
    headerClassName: 'bg-white',
    titleBarClassName: 'bg-slate-200',
    highlightClassName: 'bg-slate-300',
    lineClassName: 'bg-slate-100',
    chipClassName: 'bg-slate-50',
  },
  executive: {
    panelClassName: 'bg-slate-50',
    headerClassName: 'bg-slate-800',
    titleBarClassName: 'bg-slate-700',
    highlightClassName: 'bg-slate-900',
    lineClassName: 'bg-slate-300',
    chipClassName: 'bg-slate-200',
  },
  warm: {
    panelClassName: 'bg-rose-50',
    headerClassName: 'bg-stone-200',
    titleBarClassName: 'bg-stone-500',
    highlightClassName: 'bg-rose-300',
    lineClassName: 'bg-stone-200',
    chipClassName: 'bg-white/90',
  },
  slate: {
    panelClassName: 'bg-slate-100',
    headerClassName: 'bg-slate-500',
    titleBarClassName: 'bg-slate-700',
    highlightClassName: 'bg-cyan-700',
    lineClassName: 'bg-slate-300',
    chipClassName: 'bg-slate-200',
  },
  focus: {
    panelClassName: 'bg-white',
    headerClassName: 'bg-amber-100',
    titleBarClassName: 'bg-slate-800',
    highlightClassName: 'bg-amber-400',
    lineClassName: 'bg-slate-200',
    chipClassName: 'bg-amber-100',
  },
}

function TemplateTonePreview({ templateId }: { templateId: Exclude<ResumePdfTemplateId, 'compact'> }) {
  const tone = TEMPLATE_PREVIEW_TONES[templateId]

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 ${tone.panelClassName}`}>
      <div className={`h-4 w-full ${tone.headerClassName}`} />
      <div className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className={`h-2 w-20 rounded-full ${tone.titleBarClassName}`} />
          <div className={`h-4 w-8 rounded-full ${tone.highlightClassName}`} />
        </div>
        <div className="space-y-1.5">
          <div className={`h-1.5 w-full rounded-full ${tone.lineClassName}`} />
          <div className={`h-1.5 w-5/6 rounded-full ${tone.lineClassName}`} />
          <div className={`h-1.5 w-3/5 rounded-full ${tone.lineClassName}`} />
        </div>
        <div className="flex gap-1.5">
          <div className={`h-4 w-12 rounded-full ${tone.chipClassName}`} />
          <div className={`h-4 w-10 rounded-full ${tone.chipClassName}`} />
          <div className={`h-4 w-8 rounded-full ${tone.chipClassName}`} />
        </div>
      </div>
    </div>
  )
}

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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="relative inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <span
          aria-hidden="true"
          className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] transition-transform duration-200 ease-out ${
            value === options[0]?.value
              ? 'left-1 translate-x-0'
              : 'left-1 translate-x-full'
          }`}
        />
        {options.map((option) => {
          const isActive = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative z-10 rounded-lg px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
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
      <div className="border-b border-slate-200 bg-white px-2 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative inline-grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <span
                aria-hidden="true"
                className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] transition-transform duration-200 ease-out ${
                  pageMode === 'standard'
                    ? 'left-1 translate-x-0'
                    : 'left-1 translate-x-full'
                }`}
              />
              <button
                type="button"
                onClick={() => setPageMode('standard')}
                className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  pageMode === 'standard'
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                标准 PDF
              </button>
              <button
                type="button"
                onClick={() => setPageMode('continuous')}
                className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  pageMode === 'continuous'
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                智能一页
              </button>
            </div>
            <InlineOptionGroup
              label="密度"
              value={config.density}
              options={[
                { value: 'normal', label: '标准' },
                { value: 'compact', label: '紧凑' },
              ]}
              onChange={(nextDensity) => updateConfig({ density: nextDensity })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">主题色</span>
              <Select
                value={config.accentPreset}
                onValueChange={(nextValue) => updateConfig({ accentPreset: nextValue as ResumePdfAccentPreset })}
                options={accentPresetOptions}
                placeholder="选择主题色"
                triggerClassName="min-w-[112px] border-slate-300 bg-transparent shadow-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">标题样式</span>
              <Select
                value={config.headingStyle}
                onValueChange={(nextValue) => updateConfig({ headingStyle: nextValue as ResumePdfHeadingStyle })}
                options={headingStyleOptions}
                placeholder="选择标题样式"
                triggerClassName="min-w-[120px] border-slate-300 bg-transparent shadow-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
            >
              刷新
            </button>
            <a
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
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
      </div>
      <div
        className="grid grid-cols-[280px_minmax(0,1fr)] bg-[#eef3f9]"
        style={{ minHeight: `${effectivePreviewHeight}px` }}
      >
        <aside className="border-r border-slate-200 bg-[#f8fbff]">
          <div className="flex min-h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="text-sm font-semibold text-slate-900">模板选择</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                左侧切换模板，顶部统一调整排版参数，右侧实时查看效果。
              </p>
            </div>
            <div className="divide-y divide-slate-200">
              {visibleTemplates.map((template) => {
                const isActive = config.templateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => updateConfig({ templateId: template.id })}
                    className={`w-full px-5 py-4 text-left transition ${
                      isActive
                        ? 'bg-white'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded text-xs font-semibold ${
                        isActive ? 'bg-primary-100 text-primary-700' : 'bg-white text-slate-500'
                      }`}>
                        {template.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                            {template.name}
                          </span>
                          {isActive ? (
                            <span className="text-[11px] font-medium text-primary-700">当前</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {template.previewSummary}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {template.previewHighlights.map((highlight) => (
                            <span
                              key={highlight}
                              className="rounded bg-white px-2 py-1 text-[10px] font-medium text-slate-500"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4">
                          <TemplateTonePreview templateId={template.id as Exclude<ResumePdfTemplateId, 'compact'>} />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
        <div className="bg-[#e9f0f8] p-0">
          <div className="border-l border-slate-100">
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
  )
}
