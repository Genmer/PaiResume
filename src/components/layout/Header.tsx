import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMembership } from '../../hooks/useMembership'
import { useResumeStore } from '../../store/resumeStore'
import { getResumeImporter, resumeImporters, type ResumeImportType } from '../../utils/importers'
import { LogoMark } from '../branding/LogoMark'
import { getSavedAccounts, type SavedAccount } from '../../utils/accountMemory'

const IMPORT_LOG_PREFIX = '[resume-import]'
const MARKDOWN_FILE_PATTERN = /\.(md|markdown|txt)$/i

function logImportStep(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`${IMPORT_LOG_PREFIX} ${message}`, details)
    return
  }

  console.info(`${IMPORT_LOG_PREFIX} ${message}`)
}

function isFileDragEvent(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  return Array.from(types ?? []).includes('Files')
}

function getImportTypeFromFile(file: File): ResumeImportType | null {
  if (
    MARKDOWN_FILE_PATTERN.test(file.name)
    || file.type === 'text/markdown'
    || file.type === 'text/plain'
  ) {
    return 'markdown'
  }

  return null
}

export function Header() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { membershipTier, appMode } = useMembership()
  const { importResume } = useResumeStore()
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [importingType, setImportingType] = useState<ResumeImportType | null>(null)
  const [importError, setImportError] = useState('')
  const [draggingImportFile, setDraggingImportFile] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const menuRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const fileInputRefs = useRef<Partial<Record<ResumeImportType, HTMLInputElement | null>>>({})
  const dragDepthRef = useRef(0)

  useEffect(() => {
    if (user?.email) {
      setSavedAccounts(getSavedAccounts(user.email))
    }
  }, [user?.email])

  const handleImportFile = useCallback(async (file: File, currentType: ResumeImportType) => {
    const importer = getResumeImporter(currentType)
    logImportStep('handleImportFile:start', {
      type: currentType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      importerEnabled: importer?.enabled ?? false,
      hasParser: typeof importer?.parse === 'function',
    })

    if (!importer?.enabled || !importer.parse) {
      logImportStep('handleImportFile:importer-unavailable', {
        type: currentType,
      })
      setImportingType(null)
      setImportError('当前导入方式暂不可用')
      return
    }

    try {
      setImportingType(currentType)
      const payload = await importer.parse(file)
      logImportStep('handleImportFile:parse-success', {
        type: currentType,
        title: payload.title,
        moduleCount: payload.modules.length,
      })
      const resume = await importResume(payload)
      logImportStep('handleImportFile:store-import-success', {
        type: currentType,
        resumeId: resume.id,
      })
      navigate(`/editor/${resume.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '导入失败，请稍后再试'
      logImportStep('handleImportFile:error', {
        type: currentType,
        message,
        error,
      })
      setImportError(message)
    } finally {
      logImportStep('handleImportFile:finish', {
        type: currentType,
      })
      setImportingType(null)
    }
  }, [importResume, navigate])

  useEffect(() => {
    if (!importMenuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (menuRef.current && !menuRef.current.contains(target)) {
        setImportMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [importMenuOpen])

  useEffect(() => {
    if (!userMenuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  useEffect(() => {
    if (!isAuthenticated) {
      setDraggingImportFile(false)
      dragDepthRef.current = 0
      return
    }

    const handleDragEnter = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return
      }

      event.preventDefault()
      if (importingType) {
        return
      }
      dragDepthRef.current += 1
      setDraggingImportFile(true)
      logImportStep('dragImport:enter', {
        dragDepth: dragDepthRef.current,
      })
    }

    const handleDragOver = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return
      }

      event.preventDefault()
      if (importingType) {
        return
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
    }

    const handleDragLeave = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return
      }

      event.preventDefault()
      if (importingType) {
        return
      }
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      logImportStep('dragImport:leave', {
        dragDepth: dragDepthRef.current,
      })
      if (dragDepthRef.current === 0) {
        setDraggingImportFile(false)
      }
    }

    const handleDrop = (event: DragEvent) => {
      if (!isFileDragEvent(event)) {
        return
      }

      event.preventDefault()
      if (importingType) {
        return
      }
      dragDepthRef.current = 0
      setDraggingImportFile(false)
      setImportMenuOpen(false)

      const file = event.dataTransfer?.files?.[0]
      if (!file) {
        logImportStep('dragImport:drop-empty')
        return
      }

      const importType = getImportTypeFromFile(file)
      logImportStep('dragImport:drop', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        resolvedType: importType,
      })

      if (!importType) {
        setImportError('当前仅支持拖拽导入 Markdown / TXT 简历文件')
        return
      }

      setImportError('')
      void handleImportFile(file, importType)
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleImportFile, importingType, isAuthenticated])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSwitchAccount = (account: SavedAccount) => {
    setUserMenuOpen(false)
    setSwitchMenuOpen(false)
    navigate('/login', { state: { prefilledEmail: account.email } })
  }

  const handleImportChange = (type: ResumeImportType) => async (event: ChangeEvent<HTMLInputElement>) => {
    logImportStep('handleImportChange:fired', {
      type,
      fileCount: event.target.files?.length ?? 0,
      inputValue: event.target.value,
    })
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      logImportStep('handleImportChange:no-file-selected', {
        type,
      })
      return
    }

    logImportStep('handleImportChange:file-selected', {
      type,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
    setImportError('')
    setImportMenuOpen(false)
    await handleImportFile(file, type)
  }

  const handleImportInputMouseDown = (type: ResumeImportType) => {
    setImportError('')
    logImportStep('importInput:onMouseDown', {
      type,
      activeElement: document.activeElement instanceof HTMLElement
        ? `${document.activeElement.tagName.toLowerCase()}#${document.activeElement.id || '(no-id)'}`
        : document.activeElement?.nodeName ?? null,
    })
  }

  const handleImportInputClick = (type: ResumeImportType) => (event: ReactMouseEvent<HTMLInputElement>) => {
    logImportStep('importInput:onClick', {
      type,
      inputId: event.currentTarget.id,
      accept: event.currentTarget.accept,
    })
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4 py-3">
            <Link to="/dashboard" className="flex items-center gap-3">
              <LogoMark className="h-9 w-9" />
              <span className="text-xl font-bold text-gray-900">咕咕嘎嘎简历</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
              >
                首页
              </Link>
              <Link
                to="/pricing"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
              >
                定价
              </Link>
              <Link
                to="/survey"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
              >
                问卷
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
                  >
                    我的简历
                  </Link>
                  {user?.admin ? (
                    <Link
                      to="/admin"
                      className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
                    >
                      管理后台
                    </Link>
                  ) : null}
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setImportMenuOpen((open) => !open)}
                      disabled={!!importingType}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V6m0 0l-4 4m4-4l4 4M5 20h14" />
                      </svg>
                      {importingType ? `导入${getResumeImporter(importingType)?.label ?? ''}中...` : '导入'}
                    </button>

                    {importMenuOpen && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                        {resumeImporters.map((importer) => (
                          importer.enabled ? (
                            <div
                              key={importer.type}
                              className="relative flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50"
                            >
                              <input
                                id={`resume-import-${importer.type}`}
                                type="file"
                                accept={importer.accept}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                ref={(node) => {
                                  fileInputRefs.current[importer.type] = node
                                }}
                                onMouseDown={() => handleImportInputMouseDown(importer.type)}
                                onClick={handleImportInputClick(importer.type)}
                                onChange={handleImportChange(importer.type)}
                              />
                              <span>
                                <span className="block text-sm font-medium text-gray-700">{importer.label}</span>
                                <span className="mt-1 block text-xs text-gray-400">{importer.description}</span>
                              </span>
                            </div>
                          ) : (
                            <button
                              key={importer.type}
                              type="button"
                              disabled
                              className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:text-gray-300"
                            >
                              <span>
                                <span className="block text-sm font-medium text-gray-700">{importer.label}</span>
                                <span className="mt-1 block text-xs text-gray-400">{importer.description}</span>
                              </span>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400">
                                即将支持
                              </span>
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  {importError && (
                    <span className="max-w-xs text-xs text-red-500">{importError}</span>
                  )}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-100 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {(user?.nickname || user?.email || 'U')[0].toUpperCase()}
                      </div>
                      {(() => {
                          const tierStyles: Record<string, { label: string; bg: string; dot: string }> = {
                            FREE: { label: '免费版', bg: 'bg-gray-50 border-gray-200 text-gray-500', dot: 'bg-gray-400' },
                            LITE: { label: '基础版', bg: 'bg-amber-50 border-amber-200 text-amber-600', dot: 'bg-amber-400' },
                            PRO: { label: '专业版', bg: 'bg-blue-50 border-blue-200 text-blue-600', dot: 'bg-blue-400' },
                            MAX: { label: '旗舰版', bg: 'bg-gray-800 border-gray-700 text-gray-200', dot: 'bg-gray-300' },
                          }
                          const s = tierStyles[membershipTier] ?? tierStyles.FREE
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${s.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          )
                      })()}
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{user?.nickname || user?.email}</p>
                          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          个人中心
                        </Link>
                        <div
                          className="relative"
                          onMouseEnter={() => setSwitchMenuOpen(true)}
                          onMouseLeave={() => setSwitchMenuOpen(false)}
                        >
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                            切换账号
                            <svg className="w-3 h-3 ml-auto text-gray-300 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          </button>
                          {switchMenuOpen && (
                            <div className="absolute right-full top-0 mr-1 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-50">
                              {savedAccounts.length > 0 && savedAccounts.map((acc) => (
                                <button
                                  key={acc.email}
                                  onClick={() => handleSwitchAccount(acc)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <span className="h-6 w-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                                    {acc.nickname[0]?.toUpperCase() || acc.email[0].toUpperCase()}
                                  </span>
                                  <span className="text-left min-w-0">
                                    <span className="block truncate text-gray-800 text-xs font-medium">{acc.nickname}</span>
                                    <span className="block truncate text-gray-400 text-[11px]">{acc.email}</span>
                                  </span>
                                </button>
                              ))}
                              <button
                                onClick={() => { setUserMenuOpen(false); setSwitchMenuOpen(false); navigate('/login') }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors border-t border-gray-100 mt-1 pt-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                使用其他账号登录
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={() => { setUserMenuOpen(false); handleLogout() }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                            退出登录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${appMode === 'PRO' ? 'bg-blue-50 text-blue-500 border border-blue-200' : 'bg-emerald-50 text-emerald-500 border border-emerald-200'}`}>
                    {appMode}
                  </span>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-700"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  >
                    免费注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {isAuthenticated && draggingImportFile && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-slate-950/35 p-6 backdrop-blur-[2px]">
          <div className="flex h-full items-center justify-center rounded-[32px] border-2 border-dashed border-sky-300 bg-white/92">
            <div className="max-w-lg text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 11v8m0-8l-3 3m3-3l3 3" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">松开即可导入 Markdown 简历</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                支持 `.md`、`.markdown`、`.txt`
                {importingType ? '，当前正在处理上一份文件，请稍候。' : '，直接把文件拖到页面任意位置就行。'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
