import { useEffect, useState } from 'react'
import { useResumeStore } from '../store/resumeStore'
import { Header } from '../components/layout/Header'
import { ResumeCard } from '../components/dashboard/ResumeCard'

export default function DashboardPage() {
  const { resumeList, loading, fetchResumeList, createResume, deleteResume } = useResumeStore()
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchResumeList()
  }, [fetchResumeList])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await createResume()
    } catch (err) {
      console.error('创建失败:', err)
    } finally {
      setCreating(false)
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
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的简历</h1>
            <p className="text-gray-500 mt-1">共 {resumeList.length} 份简历</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {creating ? '创建中...' : '新建简历'}
          </button>
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
              <ResumeCard key={resume.id} resume={resume} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
