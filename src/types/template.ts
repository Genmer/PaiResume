// ==================== Template Types ====================

import type { ModuleType } from './index'

export type LayoutType = 'classic' | 'sidebar' | 'modern'

export interface TemplateStyle {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  spacing: string
}

export interface TemplateConfig {
  layoutType: LayoutType
  style: TemplateStyle
  supportedModules: ModuleType[]
}
