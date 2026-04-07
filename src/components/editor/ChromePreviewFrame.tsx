import { useMemo, useState } from 'react'
import { RESUME_PDF_TEMPLATES, type ResumePdfPageMode, type ResumePdfTemplateId } from '../../utils/resumePdf'

interface ChromePreviewFrameProps {
  resumeId: number
}

export function ChromePreviewFrame({ resumeId }: ChromePreviewFrameProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageMode, setPageMode] = useState<ResumePdfPageMode>('standard')
  const [templateId, setTemplateId] = useState<ResumePdfTemplateId>('default')
  const previewPath = `/preview/${resumeId}?pageMode=${pageMode}&templateId=${templateId}&refresh=${refreshKey}`
  const previewUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return previewPath
    }

    return new URL(previewPath, window.location.origin).toString()
  }, [previewPath])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="overflow-hidden border border-slate-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.32)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
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
              新开窗口
            </a>
          </div>
        </div>
        <div className="grid min-h-[calc(100dvh-12rem)] grid-cols-[300px_minmax(0,1fr)] bg-[#eef3f9]">
          <aside className="border-r border-slate-200 bg-white/82 backdrop-blur">
            <div className="flex min-h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="text-sm font-semibold text-slate-900">模板视图</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  左侧切换不同模板，右侧实时查看 Chrome 预览效果。
                </p>
              </div>
              <div className="space-y-3 px-4 py-4">
                {RESUME_PDF_TEMPLATES.map((template) => {
                  const isActive = templateId === template.id
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setTemplateId(template.id)}
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
          <div className="p-4">
            <div className="overflow-hidden border border-slate-300 bg-white shadow-[0_20px_48px_-36px_rgba(15,23,42,0.26)]">
              <iframe
                key={previewPath}
                title="Chrome PDF 预览"
                src={previewPath}
                className="h-[calc(100dvh-12rem)] min-h-[760px] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
