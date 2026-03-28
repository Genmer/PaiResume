import { useState, useEffect } from 'react'
import type { ProjectContent } from '../../types'
import { useAutoSave } from '../../hooks/useAutoSave'

interface Props {
  resumeId: number
  moduleId: number
  initialContent: Record<string, unknown>
}

export function ProjectForm({ resumeId, moduleId, initialContent }: Props) {
  const [content, setContent] = useState<ProjectContent>({
    projectName: '', role: '', startDate: '', endDate: '', techStack: '',
    description: '', achievements: [],
    ...initialContent as Partial<ProjectContent>,
  })
  const { save } = useAutoSave(resumeId, moduleId)

  useEffect(() => {
    save(content as unknown as Record<string, unknown>)
  }, [content, save])

  const update = (field: keyof ProjectContent, value: string | string[]) => {
    setContent((prev) => ({ ...prev, [field]: value }))
  }

  const addAchievement = () => update('achievements', [...content.achievements, ''])
  const updateAchievement = (i: number, v: string) => {
    const next = [...content.achievements]
    next[i] = v
    update('achievements', next)
  }
  const removeAchievement = (i: number) => {
    update('achievements', content.achievements.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
          <input type="text" value={content.projectName} onChange={(e) => update('projectName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">担任角色</label>
          <input type="text" value={content.role} onChange={(e) => update('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
          <input type="month" value={content.startDate} onChange={(e) => update('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
          <input type="month" value={content.endDate} onChange={(e) => update('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">技术栈</label>
        <input type="text" value={content.techStack} onChange={(e) => update('techStack', e.target.value)}
          placeholder="React, TypeScript, Node.js..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
        <textarea value={content.description} onChange={(e) => update('description', e.target.value)}
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            <button type="button" onClick={() => removeAchievement(index)}
              className="text-gray-300 hover:text-red-500 px-2">x</button>
          </div>
        ))}
      </div>
    </div>
  )
}
