import type {
  AwardDTO,
  ExperienceDTO,
  ModuleType,
  PaperDTO,
  ParsedResumeDTO,
  ResearchDTO,
} from '../../types'
import type { ImportedResumeData, ImportedResumeModule } from './markdown'

/** 全职岗位关键词：命中且无“实习”信号时按工作经历处理 */
const WORK_EXPERIENCE_POSITION_PATTERN =
  /(工程师|开发|架构师|负责人|经理|leader|主管|顾问|研究员|专家|分析师|设计师|运营|专员|产品|算法|测试|运维|数据|安全|总监|教师|医生|编辑|记者|律师|会计|审计|咨询|文案|策划|客服|销售|市场|人力|财务)/i
const INTERNSHIP_POSITION_PATTERN = /实习|intern/i
const CURRENT_EMPLOYMENT_END_PATTERN = /^(至今|现在|present|current)$/i

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? ''
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.map((value) => value?.trim() ?? '').find(Boolean) ?? ''
}

/**
 * 归一化日期为 YYYY-MM（type="month" 输入要求的格式）。
 * - “至今/现在/present/current” 原样保留为 “至今”
 * - 支持 2021.9 / 2021-9 / 2021/9 / 2021年9月 / 2021年09月 等写法
 * - 无法识别时返回 ''（空串比错误格式更能让用户在表单里察觉重填）
 */
export function normalizeMonth(value: string | undefined): string {
  const raw = normalizeText(value)
  if (!raw) {
    return ''
  }

  if (CURRENT_EMPLOYMENT_END_PATTERN.test(raw)) {
    return '至今'
  }

  const alreadyNormalized = /^(\d{4})-(\d{1,2})$/.exec(raw)
  if (alreadyNormalized) {
    const [, year, month] = alreadyNormalized
    return `${year}-${month.padStart(2, '0')}`
  }

  const matched = /(\d{4})\s*[年../-]\s*(\d{1,2})/.exec(raw)
  if (matched) {
    const [, year, month] = matched
    const monthNum = Number(month)
    if (monthNum >= 1 && monthNum <= 12) {
      return `${year}-${String(monthNum).padStart(2, '0')}`
    }
  }

  return ''
}

function buildProjectTechStack(value: string[] | undefined): string {
  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' / ')
}

function buildExperienceResponsibilities(data: ExperienceDTO): string[] {
  const directAchievements = (data.achievements ?? [])
    .map((item) => item.trim())
    .filter(Boolean)

  if (directAchievements.length > 0) {
    return directAchievements
  }

  return extractBulletLikeLines(data.description)
}

function extractBulletLikeLines(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(?:[-*+•]\s+|\d+[.、)]\s*)/.test(line))
    .map((line) => line.replace(/^(?:[-*+•]\s+|\d+[.、)]\s*)/, '').trim())
    .filter(Boolean)
}

/**
 * 经历归类为实习还是正式工作：
 * 1. 优先使用后端解析出的 employmentType（internship / full-time）
 * 2. 原文含“实习/intern”字样（职位或公司名）→ 实习
 * 3. 命中全职岗位关键词 → 工作
 * 4. 默认实习（校招场景简历更常见，误归为实习更易被用户发现并手动调整）
 */
function resolveExperienceModuleType(data: ExperienceDTO): Extract<ModuleType, 'internship' | 'work_experience'> {
  const employmentType = normalizeText(data.employmentType).toLowerCase()
  if (employmentType === 'internship') {
    return 'internship'
  }
  if (employmentType === 'full-time' || employmentType === 'fulltime' || employmentType === 'full_time') {
    return 'work_experience'
  }

  const position = normalizeText(data.position)
  const company = normalizeText(data.company)
  const endDate = normalizeText(data.endDate)

  if (INTERNSHIP_POSITION_PATTERN.test(position) || INTERNSHIP_POSITION_PATTERN.test(company)) {
    return 'internship'
  }

  if (WORK_EXPERIENCE_POSITION_PATTERN.test(position) || CURRENT_EMPLOYMENT_END_PATTERN.test(endDate)) {
    return 'work_experience'
  }

  return 'internship'
}

/** “编程语言：xxx” 形式的行拆出类别名，按出现顺序归组；无类别前缀的行落到无序组 */
function buildSkillCategories(skills: string[]): Array<{ name: string; items: string[] }> {
  const groups = new Map<string, string[]>()
  const uncategorized: string[] = []

  for (const skill of skills) {
    const trimmed = normalizeText(skill)
    if (!trimmed) {
      continue
    }

    const categorized = /^([^：:，,]{1,16})[：:]\s*(.+)$/.exec(trimmed)
    if (categorized) {
      const name = categorized[1].trim()
      const items = categorized[2].trim()
      const bucket = groups.get(name)
      if (bucket) {
        bucket.push(items)
      } else {
        groups.set(name, [items])
      }
    } else {
      uncategorized.push(trimmed)
    }
  }

  const categories: Array<{ name: string; items: string[] }> = []
  for (const [name, items] of groups) {
    categories.push({ name, items })
  }
  if (uncategorized.length > 0) {
    // 整份简历没有任何类别前缀时保持旧行为：单个无序技能组
    if (categories.length === 0) {
      return [{ name: '', items: uncategorized }]
    }
    categories.push({ name: '', items: uncategorized })
  }

  return categories
}

function buildAwardModule(award: AwardDTO): ImportedResumeModule {
  return {
    moduleType: 'award' as ModuleType,
    content: {
      awardName: normalizeText(award.awardName),
      awardTime: normalizeMonth(award.awardTime),
    },
  }
}

function buildPaperModule(paper: PaperDTO): ImportedResumeModule {
  return {
    moduleType: 'paper' as ModuleType,
    content: {
      journalType: normalizeText(paper.journalType),
      journalName: normalizeText(paper.journalName),
      publishTime: normalizeMonth(paper.publishTime),
      content: normalizeText(paper.content),
    },
  }
}

function buildResearchModule(research: ResearchDTO): ImportedResumeModule {
  return {
    moduleType: 'research' as ModuleType,
    content: {
      projectName: normalizeText(research.projectName),
      projectCycle: normalizeText(research.projectCycle),
      background: normalizeText(research.background),
      workContent: normalizeText(research.workContent),
      achievements: normalizeText(research.achievements),
    },
  }
}

export function convertParsedResumeToImported(data: ParsedResumeDTO, fileName: string): ImportedResumeData {
  const modules: ImportedResumeModule[] = []

  if (data.basicInfo) {
    const bi = data.basicInfo
    modules.push({
      moduleType: 'basic_info' as ModuleType,
      content: {
        name: bi.name || '',
        email: bi.email || '',
        phone: bi.phone || '',
        jobIntention: bi.jobIntention || '',
        github: bi.github || '',
        photo: '',
        photoBorder: false,
        hometown: '',
        wechat: '',
        blog: firstNonEmpty(bi.website),
        leetcode: '',
        workYears: bi.workYears || '',
        summary: bi.summary || '',
        targetCity: firstNonEmpty(bi.location),
        salaryRange: '',
        expectedEntryDate: '',
        isPartyMember: false,
      },
    })
  }

  if (data.educations && data.educations.length > 0) {
    for (const edu of data.educations) {
      modules.push({
        moduleType: 'education' as ModuleType,
        content: {
          school: edu.school || '',
          schoolLogo: '',
          department: edu.department || '',
          major: edu.major || '',
          degree: edu.degree || '',
          startDate: normalizeMonth(edu.startDate),
          endDate: normalizeMonth(edu.endDate),
          is985: false,
          is211: false,
          isDoubleFirst: false,
        },
      })
    }
  }

  if (data.skills && data.skills.length > 0) {
    const categories = buildSkillCategories(data.skills)
    if (categories.length > 0) {
      modules.push({
        moduleType: 'skill' as ModuleType,
        content: { categories },
      })
    }
  }

  if (data.experiences && data.experiences.length > 0) {
    for (const exp of data.experiences) {
      if (exp.company || exp.position) {
        modules.push({
          moduleType: resolveExperienceModuleType(exp),
          content: {
            company: exp.company || '',
            projectName: '',
            position: exp.position || '',
            startDate: normalizeMonth(exp.startDate),
            endDate: normalizeMonth(exp.endDate),
            techStack: '',
            projectDescription: exp.description || '',
            responsibilities: buildExperienceResponsibilities(exp),
          },
        })
      }
    }
  }

  if (data.projects && data.projects.length > 0) {
    for (const proj of data.projects) {
      if (proj.projectName) {
        modules.push({
          moduleType: 'project' as ModuleType,
          content: {
            projectName: proj.projectName || '',
            role: proj.role || '',
            startDate: normalizeMonth(proj.startDate),
            endDate: normalizeMonth(proj.endDate),
            techStack: buildProjectTechStack(proj.techStack),
            description: proj.description || '',
            achievements: proj.achievements || [],
          },
        })
      }
    }
  }

  for (const award of data.awards ?? []) {
    if (award.awardName) {
      modules.push(buildAwardModule(award))
    }
  }

  for (const paper of data.papers ?? []) {
    if (paper.journalName || paper.content) {
      modules.push(buildPaperModule(paper))
    }
  }

  for (const research of data.researches ?? []) {
    if (research.projectName) {
      modules.push(buildResearchModule(research))
    }
  }

  const title = data.basicInfo?.name
    || fileName.replace(/\.[^.]+$/, '')
    || '导入简历'

  return { title, modules }
}
