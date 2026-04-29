import type { ResumeModule } from '../api/resume'
import {
  normalizeBasicInfoContent,
  normalizeJobIntentionContent,
} from './moduleContent'

const DEFAULT_EXPORT_BASE_NAME = '简历导出'
const INVALID_FILE_NAME_PATTERN = /[\\/:*?"<>|]/g
const MULTI_SEPARATOR_PATTERN = /(?:\s*-\s*){2,}/g

function normalizeSegment(value: string) {
  return value
    .trim()
    .replace(INVALID_FILE_NAME_PATTERN, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[-\s]+|[-\s]+$/g, '')
}

export function buildResumeExportBaseName(modules: ResumeModule[]) {
  const basicInfoModule = modules.find((module) => module.moduleType === 'basic_info')
  const jobIntentionModule = modules.find((module) => module.moduleType === 'job_intention')
  const basicInfo = basicInfoModule ? normalizeBasicInfoContent(basicInfoModule.content) : null
  const jobIntention = jobIntentionModule ? normalizeJobIntentionContent(jobIntentionModule.content) : null

  const name = normalizeSegment(basicInfo?.name ?? '')
  if (!name) {
    return DEFAULT_EXPORT_BASE_NAME
  }

  const position = normalizeSegment(basicInfo?.jobIntention || jobIntention?.targetPosition || '')
  const workYears = normalizeSegment(basicInfo?.workYears ?? '')

  return [name, position, workYears]
    .filter(Boolean)
    .join('-')
    .replace(MULTI_SEPARATOR_PATTERN, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildResumeExportFileName(modules: ResumeModule[], extension: string) {
  const normalizedExtension = extension.trim().replace(/^\.+/, '')
  const baseName = buildResumeExportBaseName(modules)
  return normalizedExtension ? `${baseName}.${normalizedExtension}` : baseName
}

export function getDefaultResumeExportFileName(extension: string) {
  const normalizedExtension = extension.trim().replace(/^\.+/, '')
  return normalizedExtension ? `${DEFAULT_EXPORT_BASE_NAME}.${normalizedExtension}` : DEFAULT_EXPORT_BASE_NAME
}
