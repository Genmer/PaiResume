import type { ResumeModule } from '../../api/resume'
import { MODULE_LABELS, MODULE_ICONS, type ModuleType } from '../../types'

interface ModuleSidebarProps {
  modules: ResumeModule[]
  activeModuleType: ModuleType | null
  onSelect: (moduleType: ModuleType) => void
  onAddModule: (moduleType: ModuleType) => void
}

const ALL_MODULE_TYPES: ModuleType[] = [
  'basic_info',
  'education',
  'internship',
  'project',
  'skill',
  'paper',
  'research',
  'award',
  'job_intention',
]

export function ModuleSidebar({ modules, activeModuleType, onSelect, onAddModule }: ModuleSidebarProps) {
  const existingTypes = new Set(modules.map((m) => m.moduleType as ModuleType))

  return (
    <aside className="w-56 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">模块</h2>
        <nav className="space-y-1">
          {ALL_MODULE_TYPES.map((type) => {
            const exists = existingTypes.has(type)
            const isActive = activeModuleType === type
            const module = modules.find((m) => m.moduleType === type)
            const count = modules.filter((m) => m.moduleType === type).length

            return (
              <button
                key={type}
                onClick={() => {
                  if (exists) {
                    onSelect(type)
                  } else {
                    onAddModule(type)
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{MODULE_ICONS[type]}</span>
                <span className="flex-1">{MODULE_LABELS[type]}</span>
                {count > 1 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                )}
                {!exists && (
                  <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
