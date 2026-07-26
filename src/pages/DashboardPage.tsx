import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ResumeListItem } from '../api/resume'
import { resumeApi } from '../api/resume'
import { useResumeStore } from '../store/resumeStore'
import { Header } from '../components/layout/Header'
import { ResumeCard } from '../components/dashboard/ResumeCard'
import { getResumeImporter } from '../utils/importers'

// PDF 导入的分阶段进度，与后端解析流程对应：上传 → 文本提取 → AI 解析 → 写入模块
type ImportStage = 'idle' | 'upload' | 'extract' | 'ai' | 'build'

const IMPORT_STEPS: Array<{ key: Exclude<ImportStage, 'idle'>; label: string; hint: string }> = [
  { key: 'upload', label: '上传文件', hint: '将 PDF 上传到服务器' },
  { key: 'extract', label: '提取文本', hint: '识别 PDF 版面并抽取文字内容' },
  { key: 'ai', label: 'AI 智能解析', hint: '大模型结构化提取教育/经历/技能等信息' },
  { key: 'build', label: '生成简历模块', hint: '创建简历并写入各模块内容' },
]

const STAGE_ORDER: ImportStage[] = ['upload', 'extract', 'ai', 'build']

export default function DashboardPage() {
  const navigate = useNavigate()
  const { resumeList, loading, fetchResumeList, createResume, renameResume, deleteResume, importResume } = useResumeStore()
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [dialogMode, setDialogMode] = useState<'create' | 'rename' | 'import' | null>(null)
  const [resumeTitle, setResumeTitle] = useState('')
  const [editingResume, setEditingResume] = useState<ResumeListItem | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStage, setImportStage] = useState<ImportStage>('idle')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearImportTimers = () => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    if (extractTimerRef.current) {
      clearTimeout(extractTimerRef.current)
      extractTimerRef.current = null
    }
  }

  useEffect(() => clearImportTimers, [])

  useEffect(() => {
    fetchResumeList()
  }, [fetchResumeList])

  const handleCreate = async () => {
    setError('')
    setCreating(true)
    try {
      const title = resumeTitle.trim()
      let nextResumeId: number | null = null
      if (dialogMode === 'rename' && editingResume) {
        await renameResume(editingResume.id, title)
      } else {
        const resume = await createResume(title || undefined)
        nextResumeId = resume.id
      }
      setResumeTitle('')
      setEditingResume(null)
      setDialogMode(null)
      if (nextResumeId) {
        navigate(`/editor/${nextResumeId}?moduleType=basic_info`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : dialogMode === 'rename'
          ? '重命名失败，请稍后重试'
          : '创建失败，请稍后重试'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  const openCreateDialog = () => {
    setError('')
    setResumeTitle('')
    setEditingResume(null)
    setDialogMode('create')
  }

  const openRenameDialog = (resume: ResumeListItem) => {
    setError('')
    setResumeTitle(resume.title)
    setEditingResume(resume)
    setDialogMode('rename')
  }

  const openImportDialog = () => {
    setError('')
    setDialogMode('import')
  }

  const closeCreateDialog = () => {
    if (creating || importing) return
    setDialogMode(null)
    setResumeTitle('')
    setEditingResume(null)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      void handleFileImport(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      void handleFileImport(files[0])
    }
  }

  const handleFileImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请选择 PDF 格式的文件')
      return
    }

    setImporting(true)
    setError('')
    setImportStage('upload')
    setUploadPercent(0)
    setElapsedSec(0)
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSec((sec) => sec + 1)
    }, 1000)

    try {
      const pdfImporter = getResumeImporter('pdf')
      if (!pdfImporter?.parse) {
        throw new Error('PDF 导入功能暂不可用')
      }

      const importedData = await pdfImporter.parse(file, {
        onUploadProgress: (percent) => {
          setUploadPercent(percent)
          if (percent >= 100) {
            // 上传完成后后端先提取文本（通常 1~2 秒），随后进入耗时最长的 AI 解析阶段
            setImportStage('extract')
            if (!extractTimerRef.current) {
              extractTimerRef.current = setTimeout(() => {
                setImportStage((stage) => (stage === 'extract' ? 'ai' : stage))
              }, 1500)
            }
          }
        },
      })

      setImportStage('build')
      const newResume = await importResume(importedData)

      // 存档原始文件，之后可在编辑器中用原件重新解析；存档失败不影响导入结果
      try {
        await resumeApi.uploadSourceFile(newResume.id, file)
      } catch (archiveErr) {
        console.warn('[PaiResume] 原始文件存档失败，重新解析功能将不可用', archiveErr)
      }

      setDialogMode(null)
      navigate(`/editor/${newResume.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '导入失败，请稍后重试'
      setError(message)
    } finally {
      clearImportTimers()
      setImporting(false)
      setImportStage('idle')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteResume(id)
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的简历</h1>
            <p className="text-gray-500 mt-1">共 {resumeList.length} 份简历</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openImportDialog}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-50 px-5 py-2.5 font-semibold text-primary-700 ring-1 ring-inset ring-primary-100 transition-colors hover:bg-primary-100 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {importing ? '导入中...' : '导入简历'}
            </button>
            <button
              onClick={openCreateDialog}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-grad-brand px-5 py-2.5 font-semibold text-white shadow-brand transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {creating ? '创建中...' : '新建简历'}
            </button>
          </div>
        </div>

        {loading && resumeList.length === 0 ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : resumeList.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-4">还没有简历，点击上方按钮创建</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {resumeList.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={handleDelete}
                onRename={openRenameDialog}
              />
            ))}
          </div>
        )}
      </main>

      {dialogMode === 'import' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-pop ring-1 ring-gray-900/10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">导入 PDF 简历</h2>
              <p className="mt-1 text-sm text-gray-500">
                拖拽 PDF 文件到下方区域，或点击选择文件。系统会自动解析简历内容。
              </p>
            </div>

            {importing ? (
              <div className="rounded-xl bg-gray-50 p-6 ring-1 ring-inset ring-gray-900/5">
                <div className="space-y-4">
                  {IMPORT_STEPS.map((step) => {
                    const stepIndex = STAGE_ORDER.indexOf(step.key)
                    const currentIndex = STAGE_ORDER.indexOf(importStage)
                    const isDone = currentIndex > stepIndex
                    const isActive = currentIndex === stepIndex
                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                          {isDone ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : isActive ? (
                            <svg className="h-5 w-5 animate-spin text-primary-600" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium ${isActive ? 'text-primary-700' : isDone ? 'text-gray-700' : 'text-gray-400'}`}>
                              {step.label}
                            </p>
                            {step.key === 'upload' && isActive && (
                              <span className="text-xs tabular-nums text-primary-600">{uploadPercent}%</span>
                            )}
                          </div>
                          {isActive && (
                            <p className="mt-0.5 text-xs text-gray-500">{step.hint}</p>
                          )}
                          {step.key === 'upload' && isActive && (
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${uploadPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-3 text-xs text-gray-400">
                  <span>已用时 {elapsedSec}s</span>
                  <span>
                    {importStage === 'ai'
                      ? 'AI 解析一般需要 20~60 秒，请耐心等待'
                      : '请勿关闭页面'}
                  </span>
                </div>
              </div>
            ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <svg
                className={`mx-auto mb-3 h-12 w-12 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-primary-600">点击选择</span> 或拖拽文件到此处
              </p>
              <p className="mt-1 text-xs text-gray-400">仅支持 PDF 格式</p>
            </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeCreateDialog}
                disabled={importing}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogMode && dialogMode !== 'import' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop ring-1 ring-gray-900/10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {dialogMode === 'rename' ? '重命名简历' : '新建简历'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {dialogMode === 'rename'
                  ? '换一个更清晰的标题，后续查找会更方便。'
                  : '先给这份简历起个名字，后续也更方便管理。'}
              </p>
            </div>

            <div>
              <label htmlFor="resume-title" className="mb-2 block text-sm font-medium text-gray-700">
                简历名称
              </label>
              <input
                id="resume-title"
                name="resumeTitle"
                type="text"
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    void handleCreate()
                  }
                }}
                placeholder="例如：Java 后端简历"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateDialog}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="rounded-xl bg-grad-brand px-4 py-2 text-sm font-semibold text-white shadow-brand transition-all hover:-translate-y-px hover:brightness-110 disabled:opacity-50"
              >
                {creating
                  ? (dialogMode === 'rename' ? '保存中...' : '创建中...')
                  : (dialogMode === 'rename' ? '保存修改' : '确认创建')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
