import type { ResumeModule } from '../api/resume'
import type {
  BasicInfoContent,
  EducationContent,
  InternshipContent,
  ProjectContent,
  SkillContent,
  PaperContent,
  AwardContent,
  JobIntentionContent,
  ModuleType,
} from '../types'
export type RuleCategory = 'completeness' | 'consistency' | 'content_quality'
export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ResumeIssue {
  id: string
  category: RuleCategory
  severity: IssueSeverity
  moduleType?: ModuleType
  moduleId?: number
  field?: string
  message: string
}

export interface CheckSummary {
  errors: number
  warnings: number
  info: number
}

export interface CheckResult {
  issues: ResumeIssue[]
  summary: CheckSummary
}

export interface Rule {
  id: string
  category: RuleCategory
  severity: IssueSeverity
  check: (modules: ResumeModule[]) => ResumeIssue[]
}

function getModule<T>(modules: ResumeModule[], type: ModuleType): (ResumeModule & { content: T }) | undefined {
  return modules.find((m) => m.moduleType === type) as (ResumeModule & { content: T }) | undefined
}

function getModules<T>(modules: ResumeModule[], type: ModuleType): (ResumeModule & { content: T })[] {
  return modules.filter((m) => m.moduleType === type) as (ResumeModule & { content: T })[]
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

function isDateInFuture(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  return d > new Date()
}

function isEndBeforeStart(startDate: string, endDate: string, allowPresent: boolean): boolean {
  if (!startDate || !endDate) return false
  if (allowPresent && endDate === '至今') return false
  const s = new Date(startDate)
  const e = new Date(endDate)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return false
  return e < s
}

const PLACEHOLDER_PATTERNS = [
  /^(\s*)$/,
  /^(请输入|请填写|请选择|无|暂无|待填|待补充)/,
  /^(test|demo|example|xxx|占位|临时)/i,
  /^(待定|未定|未填写|还没想好|随便|随便写)/,
]

function hasPlaceholder(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return PLACEHOLDER_PATTERNS.some((p) => p.test(t))
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: '姓名',
    email: '邮箱',
    phone: '手机号',
    school: '学校',
    degree: '学历',
    major: '专业',
    company: '公司',
    position: '职位',
    projectName: '项目名称',
    content: '论文内容',
    jobIntention: '求职意向',
    targetPosition: '期望职位',
    summary: '个人总结',
    description: '描述',
    workContent: '工作内容',
  }
  return labels[field] || field
}

function issue(
  rule: Rule,
  overrides: Partial<ResumeIssue> & Pick<ResumeIssue, 'message'>
): ResumeIssue {
  return {
    id: rule.id,
    category: rule.category,
    severity: rule.severity,
    ...overrides,
  }
}

const rules: Rule[] = [
  {
    id: 'missing_basic_info',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const m = getModule<BasicInfoContent>(modules, 'basic_info')
      if (!m) return [issue(this, { message: '缺少基本信息模块', moduleType: 'basic_info' })]
      return []
    },
  },

  {
    id: 'basic_info_name',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const m = getModule<BasicInfoContent>(modules, 'basic_info')
      if (m && isEmpty(m.content.name)) {
        return [issue(this, { moduleType: 'basic_info', moduleId: m.id, field: 'name', message: '姓名为空' })]
      }
      return []
    },
  },

  {
    id: 'basic_info_email',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const m = getModule<BasicInfoContent>(modules, 'basic_info')
      if (m && isEmpty(m.content.email)) {
        return [issue(this, { moduleType: 'basic_info', moduleId: m.id, field: 'email', message: '邮箱为空' })]
      }
      return []
    },
  },

  {
    id: 'basic_info_phone',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const m = getModule<BasicInfoContent>(modules, 'basic_info')
      if (m && isEmpty(m.content.phone)) {
        return [issue(this, { moduleType: 'basic_info', moduleId: m.id, field: 'phone', message: '建议填写手机号' })]
      }
      return []
    },
  },

  {
    id: 'missing_education',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const mods = getModules<EducationContent>(modules, 'education')
      if (mods.length === 0) return [issue(this, { message: '缺少教育背景', moduleType: 'education' })]
      return []
    },
  },

  {
    id: 'education_school',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const mods = getModules<EducationContent>(modules, 'education')
      return mods
        .filter((m) => isEmpty(m.content.school))
        .map((m) =>
          issue(this, { moduleType: 'education', moduleId: m.id, field: 'school', message: '学校名称为空' })
        )
    },
  },

  {
    id: 'education_degree',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const mods = getModules<EducationContent>(modules, 'education')
      return mods
        .filter((m) => isEmpty(m.content.degree))
        .map((m) =>
          issue(this, { moduleType: 'education', moduleId: m.id, field: 'degree', message: '建议填写学历' })
        )
    },
  },

  {
    id: 'education_major',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const mods = getModules<EducationContent>(modules, 'education')
      return mods
        .filter((m) => isEmpty(m.content.major))
        .map((m) =>
          issue(this, { moduleType: 'education', moduleId: m.id, field: 'major', message: '建议填写专业' })
        )
    },
  },

  {
    id: 'internship_company',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const mods = getModules<InternshipContent>(modules, 'internship')
      return mods
        .filter((m) => isEmpty(m.content.company))
        .map((m) =>
          issue(this, { moduleType: 'internship', moduleId: m.id, field: 'company', message: '公司名称为空' })
        )
    },
  },

  {
    id: 'project_name',
    category: 'completeness',
    severity: 'error',
    check(modules) {
      const mods = getModules<ProjectContent>(modules, 'project')
      return mods
        .filter((m) => isEmpty(m.content.projectName))
        .map((m) =>
          issue(this, { moduleType: 'project', moduleId: m.id, field: 'projectName', message: '项目名称为空' })
        )
    },
  },

  {
    id: 'award_name',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const mods = getModules<AwardContent>(modules, 'award')
      return mods
        .filter((m) => isEmpty(m.content.awardName))
        .map((m) =>
          issue(this, { moduleType: 'award', moduleId: m.id, field: 'awardName', message: '奖项名称为空' })
        )
    },
  },

  {
    id: 'paper_content',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const mods = getModules<PaperContent>(modules, 'paper')
      return mods
        .filter((m) => isEmpty(m.content.content))
        .map((m) =>
          issue(this, { moduleType: 'paper', moduleId: m.id, field: 'content', message: '论文内容为空' })
        )
    },
  },

  {
    id: 'skill_empty',
    category: 'completeness',
    severity: 'warning',
    check(modules) {
      const m = getModule<SkillContent>(modules, 'skill')
      if (!m) return []
      const empty = (m.content.categories || []).every((c) => !c.items || c.items.length === 0)
      if (empty) return [issue(this, { moduleType: 'skill', moduleId: m.id, message: '技能分类下没有任何技能项' })]
      return []
    },
  },

  {
    id: 'date_future',
    category: 'consistency',
    severity: 'warning',
    check(modules) {
      const issues: ResumeIssue[] = []
      for (const m of modules) {
        const content = m.content as Record<string, unknown>
        const startDate = str(content.startDate)
        const endDate = str(content.endDate)
        if (isDateInFuture(startDate)) {
          issues.push(
            issue(this, {
              moduleType: m.moduleType as ModuleType,
              moduleId: m.id,
              field: 'startDate',
              message: '开始日期在未来，请检查',
            })
          )
        }
        if (endDate !== '至今' && isDateInFuture(endDate)) {
          issues.push(
            issue(this, {
              moduleType: m.moduleType as ModuleType,
              moduleId: m.id,
              field: 'endDate',
              message: '结束日期在未来，请检查',
            })
          )
        }
      }
      return issues
    },
  },

  {
    id: 'date_order',
    category: 'consistency',
    severity: 'error',
    check(modules) {
      const issues: ResumeIssue[] = []
      for (const m of modules) {
        const content = m.content as Record<string, unknown>
        const startDate = str(content.startDate)
        const endDate = str(content.endDate)
        if (isEndBeforeStart(startDate, endDate, true)) {
          issues.push(
            issue(this, {
              moduleType: m.moduleType as ModuleType,
              moduleId: m.id,
              field: 'date',
              message: '结束日期早于开始日期',
            })
          )
        }
      }
      return issues
    },
  },

  {
    id: 'placeholder_text',
    category: 'content_quality',
    severity: 'warning',
    check(modules) {
      const issues: ResumeIssue[] = []
      for (const m of modules) {
        const content = m.content as Record<string, unknown>
        for (const key of Object.keys(content)) {
          const val = content[key]
          if (typeof val === 'string' && hasPlaceholder(val)) {
            issues.push(
              issue(this, {
                moduleType: m.moduleType as ModuleType,
                moduleId: m.id,
                field: key,
                message: `"${fieldLabel(key)}" 包含占位或无效文本`,
              })
            )
          }
        }
      }
      return issues
    },
  },

  {
    id: 'summary_short',
    category: 'content_quality',
    severity: 'info',
    check(modules) {
      const m = getModule<BasicInfoContent>(modules, 'basic_info')
      if (!m) return []
      const summary = str(m.content.summary)
      if (summary && summary.length > 0 && summary.length < 50) {
        return [
          issue(this, {
            moduleType: 'basic_info',
            moduleId: m.id,
            field: 'summary',
            message: `个人总结仅 ${summary.length} 字，建议不少于 50 字`,
          }),
        ]
      }
      return []
    },
  },

  {
    id: 'description_short',
    category: 'content_quality',
    severity: 'info',
    check(modules) {
      const issues: ResumeIssue[] = []
      const descFields: Record<string, string[]> = {
        internship: ['projectDescription'],
        project: ['description'],
        research: ['background', 'workContent', 'achievements'],
      }
      for (const m of modules) {
        const fields = descFields[m.moduleType]
        if (!fields) continue
        const content = m.content as Record<string, unknown>
        for (const f of fields) {
          const val = str(content[f])
          if (val.length > 0 && val.length < 30) {
            issues.push(
              issue(this, {
                moduleType: m.moduleType as ModuleType,
                moduleId: m.id,
                field: f,
                message: `${fieldLabel(f)}仅 ${val.length} 字，建议展开描述`,
              })
            )
          }
        }
      }
      return issues
    },
  },

  {
    id: 'internship_responsibilities',
    category: 'content_quality',
    severity: 'info',
    check(modules) {
      const mods = getModules<InternshipContent>(modules, 'internship')
      const issues: ResumeIssue[] = []
      for (const m of mods) {
        if (!m.content.responsibilities || m.content.responsibilities.length === 0) {
          issues.push(
            issue(this, {
              moduleType: 'internship',
              moduleId: m.id,
              field: 'responsibilities',
              message: '建议填写核心职责',
            })
          )
        }
      }
      return issues
    },
  },

  {
    id: 'project_achievements',
    category: 'content_quality',
    severity: 'info',
    check(modules) {
      const mods = getModules<ProjectContent>(modules, 'project')
      const issues: ResumeIssue[] = []
      for (const m of mods) {
        if (!m.content.achievements || m.content.achievements.length === 0) {
          issues.push(
            issue(this, {
              moduleType: 'project',
              moduleId: m.id,
              field: 'achievements',
              message: '建议填写项目成果',
            })
          )
        }
      }
      return issues
    },
  },

  {
    id: 'missing_job_intention',
    category: 'completeness',
    severity: 'info',
    check(modules) {
      const basic = getModule<BasicInfoContent>(modules, 'basic_info')
      const intention = getModule<JobIntentionContent>(modules, 'job_intention')
      const issues: ResumeIssue[] = []
      if (basic && isEmpty(basic.content.jobIntention)) {
        issues.push(
          issue(this, {
            moduleType: 'basic_info',
            moduleId: basic.id,
            field: 'jobIntention',
            message: '建议填写求职意向',
          })
        )
      }
      if (!intention) {
        issues.push(
          issue(this, { message: '建议添加求职意向模块', moduleType: 'job_intention' })
        )
      }
      return issues
    },
  },
]

export function checkResume(modules: ResumeModule[]): CheckResult {
  const issues: ResumeIssue[] = []

  for (const rule of rules) {
    const result = rule.check(modules)
    issues.push(...result)
  }

  return {
    issues,
    summary: {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    },
  }
}

export { rules }
