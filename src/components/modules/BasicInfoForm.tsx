import { useState, useEffect } from 'react'
import type { BasicInfoContent } from '../../types'
import { useAutoSave } from '../../hooks/useAutoSave'

interface Props {
  resumeId: number
  moduleId: number
  initialContent: Record<string, unknown>
}

export function BasicInfoForm({ resumeId, moduleId, initialContent }: Props) {
  const [content, setContent] = useState<BasicInfoContent>({
    name: '', jobIntention: '', phone: '', wechat: '', isPartyMember: false,
    photo: '', hometown: '', blog: '', github: '', leetcode: '', workYears: '',
    ...initialContent as Partial<BasicInfoContent>,
  })
  const { save } = useAutoSave(resumeId, moduleId)

  useEffect(() => {
    save(content as unknown as Record<string, unknown>)
  }, [content, save])

  const update = (field: keyof BasicInfoContent, value: string | boolean) => {
    setContent((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="姓名" value={content.name} onChange={(v) => update('name', v)} />
        <Field label="求职意向" value={content.jobIntention} onChange={(v) => update('jobIntention', v)} />
        <Field label="手机号" value={content.phone} onChange={(v) => update('phone', v)} />
        <Field label="微信号" value={content.wechat} onChange={(v) => update('wechat', v)} />
        <Field label="籍贯" value={content.hometown} onChange={(v) => update('hometown', v)} />
        <Field label="工作年限" value={content.workYears} onChange={(v) => update('workYears', v)} />
        <Field label="GitHub" value={content.github} onChange={(v) => update('github', v)} />
        <Field label="博客" value={content.blog} onChange={(v) => update('blog', v)} />
        <Field label="LeetCode" value={content.leetcode} onChange={(v) => update('leetcode', v)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={content.isPartyMember}
          onChange={(e) => update('isPartyMember', e.target.checked)}
          className="rounded border-gray-300"
        />
        中共党员
      </label>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
      />
    </div>
  )
}
