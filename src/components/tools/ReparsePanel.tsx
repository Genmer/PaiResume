import { useCallback, useEffect, useRef, useState } from 'react'
import { resumeApi, type ResumeSourceFileMeta } from '../../api/resume'
import { useResumeStore } from '../../store/resumeStore'
import { convertParsedResumeToImported } from '../../utils/importers/pdf'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface Props {
  resumeId: number
}

// 重新解析的执行阶段：AI 解析原始文件 → 用解析结果重写模块
type ReparsePhase = 'idle' | 'parsing' | 'writing'

export function ReparsePanel({ resumeId }: Props) {
  const fetchModules = useResumeStore((state) => state.fetchModules)
  const [meta, setMeta] = useState<ResumeSourceFileMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [phase, setPhase] = useState<ReparsePhase>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [viewing, setViewing] = useState(false)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }, [])

  const loadMeta = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await resumeApi.getSourceFileMeta(resumeId)
      if (res.code !== 200) {
        setError(res.message || '加载原始文件信息失败')
        return
      }
      setMeta(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载原始文件信息失败')
    } finally {
      setLoading(false)
    }
  }, [resumeId])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => clearElapsedTimer, [clearElapsedTimer])

  const handleReparse = async () => {
    setConfirmOpen(false)
    setError('')
    setSuccessMessage('')
    setPhase('parsing')
    setElapsedSec(0)
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSec((sec) => sec + 1)
    }, 1000)

    try {
      // 1. 用存档原件重新执行 AI 解析（不修改简历内容）
      const { data: parseRes } = await resumeApi.parseSourceFile(resumeId)
      if (parseRes.code !== 200) {
        throw new Error(parseRes.message || '重新解析失败，请稍后重试')
      }
      const imported = convertParsedResumeToImported(parseRes.data, meta?.fileName ?? '导入简历')
      if (imported.modules.length === 0) {
        throw new Error('解析结果为空，已保留当前简历内容')
      }

      // 2. 删除现有模块，写入新解析结果（标题保持不变）
      setPhase('writing')
      const { data: modulesRes } = await resumeApi.getModules(resumeId)
      if (modulesRes.code !== 200) {
        throw new Error(modulesRes.message || '读取当前模块失败')
      }
      for (const module of modulesRes.data) {
        await resumeApi.deleteModule(resumeId, module.id)
      }
      for (const [index, module] of imported.modules.entries()) {
        try {
          await resumeApi.addModule(resumeId, {
            moduleType: module.moduleType,
            content: module.content,
            sortOrder: index,
          })
        } catch (addErr) {
          // 编辑器会自动补建 basic_info 等单例模块，与写入撮到时改为更新现有模块
          const { data: currentRes } = await resumeApi.getModules(resumeId)
          const existing = currentRes.code === 200
            ? currentRes.data.find((m) => m.moduleType === module.moduleType)
            : undefined
          if (!existing) {
            throw addErr
          }
          await resumeApi.updateModule(resumeId, existing.id, module.content)
        }
      }

      // 3. 标记解析完成并刷新编辑器
      await resumeApi.markSourceFileParsed(resumeId)
      await fetchModules(resumeId)
      await loadMeta()
      setSuccessMessage(`重新解析完成，已写入 ${imported.modules.length} 个模块`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '重新解析失败，请稍后重试')
      void loadMeta()
    } finally {
      clearElapsedTimer()
      setPhase('idle')
    }
  }

  const handleViewOriginal = async () => {
    if (!meta?.exists) return
    setViewing(true)
    setError('')
    try {
      const response = await resumeApi.downloadSourceFile(resumeId)
      const blob = new Blob([response.data], {
        type: meta.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      })
      const url = URL.createObjectURL(blob)
      if (meta.fileType === 'pdf') {
        // PDF 直接在新标签页预览
        window.open(url, '_blank', 'noopener')
      } else {
        // Word 浏览器无法预览，触发下载
        const link = document.createElement('a')
        link.href = url
        link.download = meta.fileName ?? 'resume'
        link.click()
      }
      // 延迟释放，给新标签页/下载留出加载时间
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '获取原始文件失败')
    } finally {
      setViewing(false)
    }
  }

  const busy = phase !== 'idle'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">重新解析</h2>
        <p className="text-sm text-gray-500">
          导入简历时会存档原始文件，可随时用原件重新执行 AI 解析并覆盖当前简历内容，适合调整解析效果后再次尝试
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ {successMessage}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-900/10">
        {loading ? (
          <p className="text-sm text-gray-500">加载中...</p>
        ) : !meta?.exists ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">⚪ 没有原始文件存档</p>
            <p className="text-xs leading-5 text-gray-500">
              只有通过「导入 PDF」创建的简历才会存档原始文件；这份简历可能是手动创建的，或是在存档功能上线前导入的。
              重新导入一次 PDF 即可使用重新解析。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  📄 {meta.fileName}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  存档于 {meta.uploadedAt ?? '-'} · 最近解析 {meta.lastParsedAt ?? '-'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleViewOriginal()}
                  disabled={viewing || busy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {viewing ? '打开中...' : meta.fileType === 'pdf' ? '查看原件' : '下载原件'}
                </button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  loading={busy}
                  disabled={busy}
                  size="sm"
                >
                  重新解析
                </Button>
              </div>
            </div>

            {busy && (
              <div className="rounded-xl bg-gray-50 p-3.5 ring-1 ring-inset ring-gray-900/5">
                <p className="text-sm text-gray-700">
                  {phase === 'parsing' ? '🔄 AI 正在解析原始文件...' : '🔄 正在写入简历模块...'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  已用时 {elapsedSec}s{phase === 'parsing' ? ' · AI 解析一般需要 20~60 秒，请勿关闭页面' : ''}
                </p>
              </div>
            )}

            {!busy && meta.modifiedAfterParse && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
                ⚠️ 检测到上次解析后简历内容有过手动修改，重新解析会用原始文件的解析结果覆盖全部模块，这些修改将丢失。
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 ring-1 ring-inset ring-gray-900/5">
        重新解析会删除当前简历的全部模块并写入新的解析结果（简历标题保持不变）。如需保留当前版本，建议先另建一份简历再操作。
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="确认重新解析？"
        description={
          meta?.modifiedAfterParse
            ? '检测到上次解析后你手动修改过简历内容，重新解析会用原始文件的解析结果覆盖全部模块，之前的修改将丢失且无法恢复。确定继续吗？'
            : '重新解析会用原始文件的解析结果覆盖当前简历的全部模块。确定继续吗？'
        }
        confirmText="重新解析"
        tone={meta?.modifiedAfterParse ? 'danger' : 'default'}
        onConfirm={() => void handleReparse()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
