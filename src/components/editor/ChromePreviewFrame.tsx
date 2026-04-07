import { useMemo, useState } from 'react'

interface ChromePreviewFrameProps {
  resumeId: number
}

export function ChromePreviewFrame({ resumeId }: ChromePreviewFrameProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const previewPath = `/preview/${resumeId}`
  const previewUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return previewPath
    }

    return new URL(previewPath, window.location.origin).toString()
  }, [previewPath])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_-46px_rgba(15,23,42,0.42)]">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,_#fdfefe_0%,_#f4f7fb_100%)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 items-center gap-3 overflow-hidden">
            <div className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
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
        <div className="bg-[#dfe6f0] p-4">
          <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-[0_25px_60px_-38px_rgba(15,23,42,0.34)]">
            <iframe
              key={refreshKey}
              title="Chrome 预览"
              src={previewPath}
              className="h-[calc(100dvh-12rem)] min-h-[760px] w-full bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
