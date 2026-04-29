import type { ExperienceDTO, ModuleType, ParsedResumeDTO } from '../../types'
import type { ImportedResumeData, ImportedResumeModule } from './markdown'

const WORK_EXPERIENCE_POSITION_PATTERN = /(工程师|开发|架构师|负责人|经理|leader|主管|顾问|研究员|专家)/i
const INTERNSHIP_POSITION_PATTERN = /实习/i
const CURRENT_EMPLOYMENT_END_PATTERN = /^(至今|现在|present|current)$/i

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? ''
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.map((value) => value?.trim() ?? '').find(Boolean) ?? ''
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

function resolveExperienceModuleType(data: ExperienceDTO): Extract<ModuleType, 'internship' | 'work_experience'> {
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
        hometown: firstNonEmpty(bi.location),
        wechat: '',
        blog: firstNonEmpty(bi.website),
        leetcode: '',
        workYears: bi.workYears || '',
        summary: bi.summary || '',
        targetCity: '',
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
          department: '',
          major: edu.major || '',
          degree: edu.degree || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          is985: false,
          is211: false,
          isDoubleFirst: false,
        },
      })
    }
  }

  if (data.skills && data.skills.length > 0) {
    modules.push({
      moduleType: 'skill' as ModuleType,
      content: {
        categories: [{ name: '', items: data.skills }],
      },
    })
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
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
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
      modules.push({
        moduleType: 'project' as ModuleType,
        content: {
          projectName: proj.projectName || '',
          role: proj.role || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          techStack: buildProjectTechStack(proj.techStack),
          description: proj.description || '',
          achievements: proj.achievements || [],
        },
      })
    }
  }

  const title = data.basicInfo?.name
    || fileName.replace(/\.[^.]+$/, '')
    || '导入简历'

  return { title, modules }
}
