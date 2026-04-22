import { parseMarkdownResume, type ImportedResumeData, type ImportedResumeModule } from './markdown'
import { parseResumePdf } from '../../api/pdfParser'
import { convertParsedResumeToImported } from './pdf'

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
export { convertParsedResumeToImported } from './pdf'

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
