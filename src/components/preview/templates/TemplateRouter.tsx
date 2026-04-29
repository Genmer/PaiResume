export type TemplateId = 'classic' | 'default' | 'accent' | 'minimal' | 'executive' | 'warm' | 'slate' | 'focus'

interface TemplateRouterProps {
  templateId: string
}

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  classic: '经典布局',
  default: '正常标准',
  accent: '重点色',
  minimal: '极简',
  executive: '高端商务',
  warm: '暖棕',
  slate: '石墨',
  focus: '侧边聚焦',
}

function resolveTemplateId(raw: string): TemplateId {
  if (raw in TEMPLATE_LABELS) {
    return raw as TemplateId
  }
  return 'classic'
}

export function TemplateRouter({ templateId }: TemplateRouterProps) {
  const resolvedId = resolveTemplateId(templateId)
  const label = TEMPLATE_LABELS[resolvedId]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
      <div className="text-center py-12 text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm mt-1">布局组件尚未实现</p>
      </div>
    </div>
  )
}
