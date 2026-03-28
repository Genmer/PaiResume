import type { ResumeModule } from '../../api/resume'
import { MODULE_LABELS, type ModuleType } from '../../types'

interface PreviewPanelProps {
  modules: ResumeModule[]
  loading: boolean
}

export function PreviewPanel({ modules, loading }: PreviewPanelProps) {
  if (loading && modules.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        加载中...
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>暂无模块，请在左侧添加</p>
      </div>
    )
  }

  const sortedModules = [...modules].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-[210mm] mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8 min-h-[297mm]">
          {sortedModules.map((module) => (
            <ModulePreviewSection key={module.id} module={module} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ModulePreviewSection({ module }: { module: ResumeModule }) {
  const label = MODULE_LABELS[module.moduleType as ModuleType] || module.moduleType
  const content = module.content

  const renderContent = () => {
    switch (module.moduleType) {
      case 'basic_info':
        return (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              {content.photo && (
                <img src={content.photo as string} alt="" className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{(content.name as string) || '姓名'}</h1>
                {content.jobIntention && (
                  <p className="text-gray-500">{content.jobIntention as string}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-3">
              {content.phone && <span>{content.phone as string}</span>}
              {content.wechat && <span>微信: {content.wechat as string}</span>}
              {content.github && <span>GitHub: {content.github as string}</span>}
              {content.blog && <span>博客: {content.blog as string}</span>}
              {content.workYears && <span>工作年限: {content.workYears as string}</span>}
            </div>
          </div>
        )
      case 'education':
        return (
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold">{(content.school as string) || '学校'}</span>
                <span className="text-gray-500 ml-2">{content.major as string}</span>
                <span className="text-gray-400 ml-2">{content.degree as string}</span>
              </div>
              <span className="text-sm text-gray-400">
                {content.startDate as string} - {content.endDate as string}
              </span>
            </div>
            <div className="flex gap-2 mt-1">
              {content.is985 && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">985</span>}
              {content.is211 && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">211</span>}
              {content.isDoubleFirst && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">双一流</span>}
            </div>
          </div>
        )
      case 'internship':
      case 'project':
        return (
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold">
                  {content.company ? `${content.company as string} - ` : ''}
                  {(content.projectName as string) || '项目'}
                </span>
                {content.position && <span className="text-gray-500 ml-2">{content.position as string}</span>}
                {content.role && <span className="text-gray-500 ml-2">{content.role as string}</span>}
              </div>
              <span className="text-sm text-gray-400">
                {content.startDate as string} - {content.endDate as string}
              </span>
            </div>
            {content.techStack && (
              <p className="text-sm text-gray-500 mt-1">技术栈: {content.techStack as string}</p>
            )}
            {content.description && (
              <p className="text-sm text-gray-600 mt-1">{content.description as string}</p>
            )}
            {content.responsibilities && (
              <p className="text-sm text-gray-600 mt-1">{content.responsibilities as string}</p>
            )}
            {Array.isArray(content.achievements) && (content.achievements as string[]).length > 0 && (
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600 space-y-0.5">
                {(content.achievements as string[]).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        )
      case 'skill':
        return (
          <div className="mb-4">
            {Array.isArray(content.categories) &&
              (content.categories as Array<{ name: string; items: string[] }>).map((cat, i) => (
                <div key={i} className="mb-2">
                  <span className="font-semibold">{cat.name}:</span>{' '}
                  <span className="text-gray-600">{cat.items.join('、')}</span>
                </div>
              ))}
          </div>
        )
      case 'paper':
        return (
          <div className="mb-3">
            <p>
              <span className="font-semibold">{content.journalName as string}</span>
              <span className="text-gray-500 ml-2">({content.journalType as string})</span>
              <span className="text-gray-400 ml-2">{content.publishTime as string}</span>
            </p>
            {content.content && <p className="text-sm text-gray-600 mt-1">{content.content as string}</p>}
          </div>
        )
      case 'research':
        return (
          <div className="mb-4">
            <p className="font-semibold">{(content.projectName as string) || '科研项目'}</p>
            {content.projectCycle && <p className="text-sm text-gray-400">周期: {content.projectCycle as string}</p>}
            {content.background && <p className="text-sm text-gray-600 mt-1">背景: {content.background as string}</p>}
            {content.workContent && <p className="text-sm text-gray-600 mt-1">工作: {content.workContent as string}</p>}
            {content.achievements && <p className="text-sm text-gray-600 mt-1">成果: {content.achievements as string}</p>}
          </div>
        )
      case 'award':
        return (
          <div className="mb-2 flex justify-between">
            <span>{(content.awardName as string) || '奖项'}</span>
            <span className="text-sm text-gray-400">{content.awardTime as string}</span>
          </div>
        )
      case 'job_intention':
        return (
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            {content.targetPosition && <span>意向岗位: {content.targetPosition as string}</span>}
            {content.targetCity && <span>意向城市: {content.targetCity as string}</span>}
            {content.salaryRange && <span>期望薪资: {content.salaryRange as string}</span>}
            {content.expectedEntryDate && <span>到岗时间: {content.expectedEntryDate as string}</span>}
          </div>
        )
      default:
        return <pre className="text-xs text-gray-400">{JSON.stringify(content, null, 2)}</pre>
    }
  }

  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-1 mb-2">
        {label}
      </h2>
      {renderContent()}
    </div>
  )
}
