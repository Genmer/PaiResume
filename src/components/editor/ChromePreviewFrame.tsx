import { useMemo, useState } from 'react'
import type { ResumePdfPageMode } from '../../utils/resumePdf'

interface ChromePreviewFrameProps {
  resumeId: number
}

export function ChromePreviewFrame({ resumeId }: ChromePreviewFrameProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageMode, setPageMode] = useState<ResumePdfPageMode>('standard')
  const previewPath = `/preview/${resumeId}?pageMode=${pageMode}&refresh=${refreshKey}`
  const previewUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return previewPath
    }

    return new URL(previewPath, window.location.origin).toString()
  }, [previewPath])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_-46px_rgba(15,23,42,0.42)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="rounded-full border border-slate-200 bg-slate-50 p-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPageMode('standard')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
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
            <div className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
              <span className="block truncate">{previewUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
            >
              刷新
            </button>
            <a
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-200 hover:text-primary-700"
            >
              新开窗口
            </a>
          </div>
        </div>
        <div className="bg-[#eef3f9] p-4">
          <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-[0_25px_60px_-38px_rgba(15,23,42,0.34)]">
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
  )
}
