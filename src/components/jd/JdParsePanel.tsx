import { useState, useEffect } from 'react'
import { resumeApi, type JdParseResult } from '../../api/resume'
import { membershipApi } from '../../api/membership'
import { Button } from '../ui/Button'
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea'

type TabKey = 'requiredSkills' | 'preferredSkills' | 'responsibilities'

const TAB_LABELS: Record<TabKey, string> = {
  requiredSkills: '硬性技能',
  preferredSkills: '加分技能',
  responsibilities: '岗位职责',
}

interface Props {
  resumeId: number
}

export function JdParsePanel({ resumeId }: Props) {
  const [jdText, setJdText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<JdParseResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('requiredSkills')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [applying, setApplying] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    membershipApi.status().then(({ data: res }) => {
      if (res.code === 200 && res.data) {
        setRemaining(res.data.jdParseRemaining)
      }
    }).catch(() => {})
  }, [])

  const handleParse = async () => {
    if (!jdText.trim()) return
    setError('')
    setParsing(true)
    setResult(null)
    setSelectedItems({})
    try {
      const { data: res } = await resumeApi.jdParse(resumeId, jdText.trim())
      if (res.code !== 200) {
        setError(res.message || '解析失败')
        return
      }
      setResult(res.data)
      if (remaining !== null && remaining > 0) {
        setRemaining(remaining - 1)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '解析失败，请稍后重试')
    } finally {
      setParsing(false)
    }
  }

  const currentList = result?.[activeTab] ?? []

  const toggleItem = (index: number) => {
    const key = `${activeTab}-${index}`
    setSelectedItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAll = () => {
    const allSelected = currentList.every((_, i) => selectedItems[`${activeTab}-${i}`])
    const next: Record<string, boolean> = { ...selectedItems }
    currentList.forEach((_, i) => {
      next[`${activeTab}-${i}`] = !allSelected
    })
    setSelectedItems(next)
  }

  const selectedCount = currentList.filter((_, i) => selectedItems[`${activeTab}-${i}`]).length
  const totalSelected = result
    ? Object.values(selectedItems).filter(Boolean).length
    : 0

  const handleApply = async () => {
    if (!result || totalSelected === 0) return
    setApplying(true)
    try {
      const selectedSkills: string[] = []
      ;(['requiredSkills', 'preferredSkills'] as TabKey[]).forEach((tab) => {
        result[tab].forEach((item, i) => {
          if (selectedItems[`${tab}-${i}`]) {
            selectedSkills.push(item)
          }
        })
      })

      const { data: modulesRes } = await resumeApi.getModules(resumeId)
      const existingSkillModule = modulesRes.data.find((m) => m.moduleType === 'skill')
      const skillContent = {
        categories: [{ name: '', items: selectedSkills }],
      }

      if (existingSkillModule) {
        const existingItems = (existingSkillModule.content as Record<string, unknown>)?.categories as Array<{ name: string; items: string[] }> | undefined
        const mergedItems = [
          ...(existingItems?.[0]?.items ?? []),
          ...selectedSkills.filter((s) => !(existingItems?.[0]?.items ?? []).includes(s)),
        ]
        await resumeApi.updateModule(resumeId, existingSkillModule.id, {
          categories: [{ name: '', items: mergedItems }],
        })
      } else if (selectedSkills.length > 0) {
        await resumeApi.addModule(resumeId, { moduleType: 'skill', content: skillContent })
      }

      setResult(null)
      setJdText('')
      setSelectedItems({})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '应用失败')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            JD 文本
          </label>
          {remaining !== null && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              remaining <= 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {remaining <= 0 ? '今日次数已用完' : `今日剩余 ${remaining} 次`}
            </span>
          )}
        </div>
        <AutoResizeTextarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          minRows={6}
          placeholder="粘贴职位描述（JD）文本，AI 将自动提取技能要求和岗位职责..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          disabled={parsing}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button
            onClick={() => void handleParse()}
            loading={parsing}
            disabled={!jdText.trim() || parsing || remaining === 0}
            size="sm"
          >
            解析
          </Button>
          {parsing && (
            <span className="text-sm text-gray-500">AI 正在分析职位描述...</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 pt-4">
            <div className="mb-1 flex items-center gap-2">
              {result.jobTitle && (
                <span className="text-base font-semibold text-gray-900">{result.jobTitle}</span>
              )}
              {result.company && (
                <span className="text-sm text-gray-500">{result.company}</span>
              )}
            </div>
            <div className="flex gap-1">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === tab
                      ? 'text-primary-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({currentList.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {currentList.length > 0 ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                    <input
                      type="checkbox"
                      checked={currentList.every((_, i) => selectedItems[`${activeTab}-${i}`])}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    全选
                  </label>
                  <span className="text-xs text-gray-400">
                    已选 {selectedCount} / {currentList.length} 项
                  </span>
                </div>
                <ul className="space-y-2">
                  {currentList.map((item, index) => (
                    <li key={index}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm leading-6 text-gray-700 transition hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={!!selectedItems[`${activeTab}-${index}`]}
                          onChange={() => toggleItem(index)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">
                暂无{TAB_LABELS[activeTab]}信息
              </p>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <Button
                onClick={() => void handleApply()}
                disabled={totalSelected === 0}
                loading={applying}
                size="sm"
              >
                {totalSelected > 0 ? `应用到简历（已选 ${totalSelected} 项）` : '应用到简历'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
