import { useState, useEffect } from 'react'
import type { InternshipContent } from '../../types'
import { useAutoSave } from '../../hooks/useAutoSave'

interface Props {
  resumeId: number
  moduleId: number
  initialContent: Record<string, unknown>
}

export function InternshipForm({ resumeId, moduleId, initialContent }: Props) {
  const [content, setContent] = useState<InternshipContent>({
    company: '', projectName: '', position: '', startDate: '', endDate: '',
    techStack: '', responsibilities: '', achievements: [],
    ...initialContent as Partial<InternshipContent>,
  })
  const { save } = useAutoSave(resumeId, moduleId)

  useEffect(() => {
    save(content as unknown as Record<string, unknown>)
  }, [content, save])

  const update = (field: keyof InternshipContent, value: string | string[]) => {
    setContent((prev) => ({ ...prev, [field]: value }))
  }

  const addAchievement = () => {
    update('achievements', [...content.achievements, ''])
  }

  const updateAchievement = (index: number, value: string) => {
    const next = [...content.achievements]
    next[index] = value
    update('achievements', next)
  }

  const removeAchievement = (index: number) => {
    update('achievements', content.achievements.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
          <input type="text" value={content.company} onChange={(e) => update('company', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
          <input type="text" value={content.projectName} onChange={(e) => update('projectName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
          <input type="text" value={content.position} onChange={(e) => update('position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始</label>
            <input type="month" value={content.startDate} onChange={(e) => update('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束</label>
            <input type="month" value={content.endDate} onChange={(e) => update('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">技术栈</label>
        <input type="text" value={content.techStack} onChange={(e) => update('techStack', e.target.value)}
          placeholder="Java, Spring Boot, MySQL..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">工作职责</label>
        <textarea value={content.responsibilities} onChange={(e) => update('responsibilities', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">主要成果</label>
          <button type="button" onClick={addAchievement}
            className="text-sm text-primary-600 hover:text-primary-700">+ 添加</button>
        </div>
        {content.achievements.map((item, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input type="text" value={item} onChange={(e) => updateAchievement(index, e.target.value)}
              placeholder={`成果 ${index + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            <button type="button" onClick={() => removeAchievement(index)}
              className="text-gray-300 hover:text-red-500 px-2">x</button>
          </div>
        ))}
      </div>
    </div>
  )
}
