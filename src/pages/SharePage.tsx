import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApi, type SharedResume } from '../api/public'
import { ResumePreview } from '../components/preview/ResumePreview'
import { buildAnalysisResume } from '../utils/resumeAnalysisAdapter'
import { LogoMark } from '../components/branding/LogoMark'

export default function SharePage() {
  const { token = '' } = useParams<{ token: string }>()
  const [detail, setDetail] = useState<SharedResume | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: res } = await publicApi.sharedResume(token)
        if (res.code !== 200) {
          setError(res.message || '分享链接不存在或已关闭')
          return
        }
        setDetail(res.data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '分享链接不存在或已关闭'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      void loadDetail()
    }
  }, [token])

  const resume = useMemo(() => (
    detail ? buildAnalysisResume(detail.modules) : null
  ), [detail])

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-base font-semibold text-gray-900">派简历</span>
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-grad-brand px-4 py-2 text-sm font-medium text-white shadow-brand transition-all hover:-translate-y-px hover:brightness-110"
          >
            我也要做简历
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : detail && resume ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{detail.title}</h1>
                <p className="mt-1 text-xs text-gray-400">更新于 {detail.updatedAt} · 由派简历用户分享</p>
              </div>
            </div>
            <ResumePreview resume={resume} />
            <p className="text-center text-xs text-gray-400">
              本页面由简历所有者主动分享，内容由用户提供 ·{' '}
              <Link to="/" className="text-primary-600 hover:text-primary-700">派简历</Link> 提供技术支持
            </p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
