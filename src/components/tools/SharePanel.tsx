import { useCallback, useEffect, useState } from 'react'
import { resumeApi, type ResumeShareStatus } from '../../api/resume'
import { Button } from '../ui/Button'

interface Props {
  resumeId: number
}

export function SharePanel({ resumeId }: Props) {
  const [status, setStatus] = useState<ResumeShareStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const shareUrl = status?.enabled && status.shareToken
    ? `${window.location.origin}/share/${status.shareToken}`
    : ''

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await resumeApi.getShareStatus(resumeId)
      if (res.code !== 200) {
        setError(res.message || '加载分享状态失败')
        return
      }
      setStatus(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载分享状态失败')
    } finally {
      setLoading(false)
    }
  }, [resumeId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleToggle = async () => {
    if (!status) return
    setSwitching(true)
    setError('')
    setCopied(false)
    try {
      const { data: res } = status.enabled
        ? await resumeApi.disableShare(resumeId)
        : await resumeApi.enableShare(resumeId)
      if (res.code !== 200) {
        setError(res.message || '操作失败，请稍后重试')
        return
      }
      setStatus(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败，请稍后重试')
    } finally {
      setSwitching(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败，请手动选择链接复制')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">在线分享</h2>
        <p className="text-sm text-gray-500">
          生成一个公开链接，把简历以在线网页形式分享给 HR 或朋友，无需对方登录即可查看
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-900/10">
        {loading ? (
          <p className="text-sm text-gray-500">加载中...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {status?.enabled ? '🟢 分享已开启' : '⚪ 分享未开启'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {status?.enabled
                    ? `任何拿到链接的人都可以查看这份简历 · 已被查看 ${status.viewCount} 次`
                    : '开启后会生成一个公开访问链接，关闭后链接立即失效'}
                </p>
              </div>
              <Button
                onClick={() => void handleToggle()}
                loading={switching}
                disabled={switching}
                size="sm"
                variant={status?.enabled ? 'secondary' : 'primary'}
              >
                {status?.enabled ? '关闭分享' : '开启分享'}
              </Button>
            </div>

            {status?.enabled && shareUrl && (
              <div className="rounded-xl bg-gray-50 p-3.5 ring-1 ring-inset ring-gray-900/5">
                <p className="mb-2 text-xs font-medium text-gray-500">分享链接</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="shrink-0 rounded-lg border border-primary-200 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                  >
                    {copied ? '✓ 已复制' : '复制链接'}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    预览
                  </a>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  链接内容与简历实时同步，修改简历后访客看到的也是最新版本；重新开启分享会复用原链接。
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
        分享链接包含简历中的个人信息（如姓名、电话、邮箱），请只发送给需要查看的人；不再需要时建议及时关闭分享。
      </div>
    </div>
  )
}
