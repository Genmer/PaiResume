import { parseMarkdownResume, type ImportedResumeData, type ImportedResumeModule } from './markdown'
import { parseResumePdf } from '../../api/pdfParser'
import type { ModuleType, ParsedResumeDTO } from '../../types'

export type ResumeImportType = 'markdown' | 'word' | 'pdf'

export interface ResumeImporter {
  type: ResumeImportType
  label: string
  accept: string
  enabled: boolean
  description: string
  parse?: (file: File) => Promise<ImportedResumeData>
}

export type { ImportedResumeData, ImportedResumeModule }

/**
 * 将后端解析结果转换为 ImportedResumeData
 */
function convertParsedResumeToImported(data: ParsedResumeDTO, fileName: string): ImportedResumeData {
  const modules: ImportedResumeModule[] = []

  // 基本信息
  if (data.basicInfo) {
    const bi = data.basicInfo
    modules.push({
      moduleType: 'basic_info' as ModuleType,
      content: {
        name: bi.name || '',
        email: bi.email || '',
        phone: bi.phone || '',
        jobIntention: '',
        github: bi.github || '',
        website: bi.website || '',
        photo: '',
        photoBorder: false,
        hometown: '',
        wechat: '',
        blog: '',
        leetcode: '',
        workYears: '',
        summary: bi.summary || '',
        targetCity: '',
        salaryRange: '',
        expectedEntryDate: '',
        isPartyMember: false,
      },
    })
  }

  // 教育背景
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

  // 技能
  if (data.skills && data.skills.length > 0) {
    modules.push({
      moduleType: 'skill' as ModuleType,
      content: {
        categories: [{ name: '', items: data.skills }],
      },
    })
  }

  // 工作经历/实习经历
  if (data.experiences && data.experiences.length > 0) {
    for (const exp of data.experiences) {
      if (exp.company || exp.position) {
        modules.push({
          moduleType: 'internship' as ModuleType,
          content: {
            company: exp.company || '',
            projectName: '',
            position: exp.position || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            techStack: '',
            projectDescription: '',
            responsibilities: [],
          },
        })
      }
    }
  }

  // 项目经历
  if (data.projects && data.projects.length > 0) {
    for (const proj of data.projects) {
      modules.push({
        moduleType: 'project' as ModuleType,
        content: {
          projectName: proj.projectName || '',
          role: proj.role || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          techStack: proj.techStack || '',
          description: proj.description || '',
          achievements: proj.achievements || [],
        },
      })
    }
  }

  // 生成标题
  const title = data.basicInfo?.name
    || fileName.replace(/\.[^.]+$/, '')
    || '导入简历'

  return { title, modules }
}

/**
 * 解析 PDF 简历（调用后端 API）
 */
async function parsePdfResume(file: File): Promise<ImportedResumeData> {
  try {
    const result = await parseResumePdf(file)
    return convertParsedResumeToImported(result, file.name)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF 解析失败: ${error.message}`)
    }
    throw new Error('PDF 解析失败: 未知错误')
  }
}

export const resumeImporters: ResumeImporter[] = [
  {
    type: 'markdown',
    label: 'Markdown',
    accept: '.md,.markdown,.txt,text/markdown,text/plain',
    enabled: true,
    description: '导入结构化 Markdown 简历',
    parse: async (file) => parseMarkdownResume(await file.text(), file.name),
  },
  {
    type: 'word',
    label: 'Word',
    accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    enabled: false,
    description: '即将支持 DOC / DOCX 导入',
  },
  {
    type: 'pdf',
    label: 'PDF',
    accept: '.pdf,application/pdf',
    enabled: true,
    description: '导入 PDF 格式简历',
    parse: parsePdfResume,
  },
]

export function getResumeImporter(type: ResumeImportType): ResumeImporter | undefined {
  return resumeImporters.find((importer) => importer.type === type)
}
