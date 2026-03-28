import { useState, useEffect } from 'react'
import type { SkillContent } from '../../types'
import { useAutoSave } from '../../hooks/useAutoSave'

interface Props {
  resumeId: number
  moduleId: number
  initialContent: Record<string, unknown>
}

export function SkillForm({ resumeId, moduleId, initialContent }: Props) {
  const [content, setContent] = useState<SkillContent>({
    categories: [{ name: '编程语言', items: [] }],
    ...initialContent as Partial<SkillContent>,
  })
  const { save } = useAutoSave(resumeId, moduleId)

  useEffect(() => {
    save(content as unknown as Record<string, unknown>)
  }, [content, save])

  const addCategory = () => {
    setContent((prev) => ({
      categories: [...prev.categories, { name: '', items: [] }],
    }))
  }

  const removeCategory = (index: number) => {
    setContent((prev) => ({
      categories: prev.categories.filter((_, i) => i !== index),
    }))
  }

  const updateCategoryName = (index: number, name: string) => {
    setContent((prev) => ({
      categories: prev.categories.map((cat, i) => (i === index ? { ...cat, name } : cat)),
    }))
  }

  const updateCategoryItems = (index: number, itemsText: string) => {
    const items = itemsText.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
    setContent((prev) => ({
      categories: prev.categories.map((cat, i) => (i === index ? { ...cat, items } : cat)),
    }))
  }

  return (
    <div className="space-y-4">
      {content.categories.map((cat, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex gap-3 mb-2">
            <input type="text" value={cat.name}
              onChange={(e) => updateCategoryName(index, e.target.value)}
              placeholder="分类名称，如：编程语言、框架、工具"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
            <button type="button" onClick={() => removeCategory(index)}
              className="text-gray-300 hover:text-red-500 px-2 text-sm">删除</button>
          </div>
          <input type="text"
            value={cat.items.join('、')}
            onChange={(e) => updateCategoryItems(index, e.target.value)}
            placeholder="用顿号或逗号分隔，如：Java、Go、Python"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" />
        </div>
      ))}
      <button type="button" onClick={addCategory}
        className="text-sm text-primary-600 hover:text-primary-700">+ 添加技能分类</button>
    </div>
  )
}
