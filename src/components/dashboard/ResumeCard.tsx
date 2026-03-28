import { useNavigate } from 'react-router-dom'
import type { ResumeListItem } from '../../api/resume'

interface ResumeCardProps {
  resume: ResumeListItem
  onDelete: (id: number) => void
}

export function ResumeCard({ resume, onDelete }: ResumeCardProps) {
  const navigate = useNavigate()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`确定要删除「${resume.title}」吗？`)) {
      onDelete(resume.id)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div
      onClick={() => navigate(`/editor/${resume.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {resume.title}
        </h3>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="w-full h-32 bg-gray-50 rounded-lg mb-4 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>模板: {resume.templateId || '默认'}</span>
        <span>更新于 {formatDate(resume.updatedAt)}</span>
      </div>
    </div>
  )
}
