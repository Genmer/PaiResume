import { useState } from 'react'
import {
  RESUME_PDF_TEMPLATES,
  type ResumePdfTemplateId,
} from '../../utils/resumePdf'
import { MembershipUpgradeModal } from '../membership/MembershipUpgradeModal'

const PREMIUM_TEMPLATE_IDS = new Set<ResumePdfTemplateId>(['executive', 'slate', 'focus'])

interface TemplatePickerProps {
  selectedTemplateId: ResumePdfTemplateId
  onSelect: (templateId: ResumePdfTemplateId) => void
  isMember: boolean
}

function PremiumBadge() {
  return (
    <span className="absolute -top-2 -right-2 inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
      PRO
    </span>
  )
}

function ThumbnailPreview({ templateId }: { templateId: ResumePdfTemplateId }) {
  switch (templateId) {
    case 'default':
      return (
        <div className="h-28 rounded-lg bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]">
          <div className="h-1.5 w-11 rounded-full bg-slate-700" />
          <div className="mt-2.5 h-px w-full bg-slate-200" />
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <div className="h-1 w-full rounded bg-slate-200" />
              <div className="h-1 w-10/12 rounded bg-slate-200" />
            </div>
            <div className="space-y-1">
              <div className="h-1 w-9/12 rounded bg-slate-200" />
              <div className="h-1 w-8/12 rounded bg-slate-200" />
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2.5 w-10 rounded-full bg-blue-50" />
            <div className="h-2.5 w-8 rounded-full bg-blue-50" />
          </div>
        </div>
      )
    case 'accent':
      return (
        <div className="h-28 rounded-lg bg-blue-50 p-2.5 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.9)]">
          <div className="relative">
            <div className="h-2.5 w-14 rounded bg-blue-500" />
            <div className="absolute -bottom-0.5 left-0 h-0.5 w-7 rounded-full bg-blue-500/80" />
          </div>
          <div className="mt-2.5 h-px w-full bg-blue-200" />
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-blue-200/80" />
            <div className="h-1 w-10/12 rounded bg-blue-200/60" />
            <div className="h-1 w-8/12 rounded bg-blue-200/60" />
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2.5 w-10 rounded-full bg-blue-100" />
            <div className="h-2.5 w-7 rounded-full bg-blue-100" />
          </div>
        </div>
      )
    case 'minimal':
      return (
        <div className="h-28 rounded-lg bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]">
          <div className="h-1.5 w-14 rounded-full bg-slate-900" />
          <div className="mt-2 h-0.5 w-7 rounded-full bg-slate-100" />
          <div className="mt-2.5 space-y-1.5">
            <div className="h-1 w-full rounded bg-slate-100" />
            <div className="h-1 w-8/12 rounded bg-slate-100" />
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2.5 w-10 rounded-full bg-slate-50" />
            <div className="h-2.5 w-8 rounded-full bg-slate-50" />
            <div className="h-2.5 w-6 rounded-full bg-slate-50" />
          </div>
        </div>
      )
    case 'executive':
      return (
        <div className="h-28 overflow-hidden rounded-lg bg-slate-50 shadow-[inset_0_0_0_1px_rgba(203,213,225,0.9)]">
          <div className="bg-slate-800 px-2.5 py-2">
            <div className="h-2 w-12 rounded bg-white/90" />
            <div className="mt-1.5 h-1 w-full rounded bg-white/15" />
          </div>
          <div className="px-2.5 py-2">
            <div className="h-1.5 w-10 rounded-full bg-slate-700" />
            <div className="mt-1.5 space-y-1">
              <div className="h-1 w-full rounded bg-slate-300" />
              <div className="h-1 w-10/12 rounded bg-slate-300" />
            </div>
            <div className="mt-1.5 flex gap-1">
              <div className="h-2.5 w-10 rounded-full bg-slate-200" />
              <div className="h-2.5 w-7 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      )
    case 'warm':
      return (
        <div className="h-28 rounded-lg bg-stone-50 p-2.5 shadow-[inset_0_0_0_1px_rgba(243,232,216,0.95)]">
          <div className="h-2 w-14 rounded bg-stone-600" />
          <div className="mt-2 h-px w-full bg-[#f3e8d8]" />
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-stone-200" />
            <div className="h-1 w-9/12 rounded bg-stone-200" />
            <div className="h-1 w-8/12 rounded bg-stone-200" />
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2.5 w-11 rounded-full bg-orange-100" />
            <div className="h-2.5 w-7 rounded-full bg-orange-100" />
          </div>
        </div>
      )
    case 'slate':
      return (
        <div className="h-28 rounded-lg bg-slate-100 p-2.5 shadow-[inset_0_0_0_1px_rgba(203,213,225,0.9)]">
          <div className="inline-block rounded bg-slate-300 px-1.5 py-0.5">
            <div className="h-1.5 w-10 rounded bg-slate-700" />
          </div>
          <div className="mt-2 rounded bg-white px-1.5 py-1.5">
            <div className="h-1 w-full rounded bg-slate-200" />
            <div className="mt-1 h-1 w-10/12 rounded bg-slate-200" />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <div className="h-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 rounded-full bg-slate-200" />
            <div className="h-2.5 rounded-full bg-slate-200" />
          </div>
        </div>
      )
    case 'focus':
      return (
        <div className="h-28 rounded-lg bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]">
          <div className="flex items-start gap-2">
            <div className="h-full w-1.5 shrink-0 self-stretch rounded-full bg-blue-500" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-2 w-14 rounded bg-blue-900" />
              <div className="h-1 w-full rounded bg-slate-200" />
              <div className="h-1 w-9/12 rounded bg-slate-200" />
            </div>
            <div className="h-7 w-7 shrink-0 rounded bg-blue-100" />
          </div>
          <div className="mt-2 ml-[26px] flex gap-1">
            <div className="h-2.5 w-10 rounded-full bg-blue-100" />
            <div className="h-2.5 w-8 rounded-full bg-blue-100" />
          </div>
        </div>
      )
    default:
      return (
        <div className="h-28 rounded-lg bg-white p-2.5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]">
          <div className="h-1.5 w-11 rounded-full bg-slate-700" />
          <div className="mt-2.5 h-px w-full bg-slate-200" />
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-slate-200" />
            <div className="h-1 w-8/12 rounded bg-slate-200" />
          </div>
          <div className="mt-2 flex gap-1">
            <div className="h-2.5 w-10 rounded-full bg-slate-100" />
            <div className="h-2.5 w-7 rounded-full bg-slate-100" />
          </div>
        </div>
      )
  }
}

export function TemplatePicker({ selectedTemplateId, onSelect, isMember }: TemplatePickerProps) {
  const [membershipModalOpen, setMembershipModalOpen] = useState(false)

  const visibleTemplates = RESUME_PDF_TEMPLATES.filter((template) => template.id !== 'compact')

  const handleTemplateClick = (templateId: ResumePdfTemplateId) => {
    if (PREMIUM_TEMPLATE_IDS.has(templateId) && !isMember) {
      setMembershipModalOpen(true)
      return
    }
    onSelect(templateId)
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">选择模板</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            选择一个模板样式，预览效果会即时更新
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTemplates.map((template) => {
            const isPremium = PREMIUM_TEMPLATE_IDS.has(template.id)
            const isSelected = selectedTemplateId === template.id

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50/40 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {isPremium && <PremiumBadge />}
                <ThumbnailPreview templateId={template.id} />
                <div className="mt-3">
                  <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{template.description}</p>
                </div>
                {isSelected && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-primary-600">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    已选择
                  </div>
                )}
                {isPremium && !isMember && (
                  <div className="mt-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
                      </svg>
                      会员专享
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <MembershipUpgradeModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
      />
    </>
  )
}
