import type { ResumeModule } from '../../../api/resume'
import {
  normalizeAwardContent,
  normalizeBasicInfoContent,
  normalizeEducationContent,
  normalizeInternshipContent,
  normalizeJobIntentionContent,
  normalizePaperContent,
  normalizeProjectContent,
  normalizeResearchContent,
  normalizeSkillContent,
} from '../../../utils/moduleContent'
import { getModuleDisplayLabel } from '../../../utils/resumeDisplay'

interface SidebarLayoutProps {
  modules: ResumeModule[]
}

export default function SidebarLayout({ modules }: SidebarLayoutProps) {
  const moduleMap = new Map<string, ResumeModule[]>()
  for (const mod of modules) {
    const list = moduleMap.get(mod.moduleType) || []
    list.push(mod)
    moduleMap.set(mod.moduleType, list)
  }

  const basicInfoModule = moduleMap.get('basic_info')?.[0]
  const basicInfo = basicInfoModule ? normalizeBasicInfoContent(basicInfoModule.content) : null

  const skillModule = moduleMap.get('skill')?.[0]
  const skillContent = skillModule ? normalizeSkillContent(skillModule.content) : null

  const jobIntentionModule = moduleMap.get('job_intention')?.[0]
  const jobIntention = jobIntentionModule ? normalizeJobIntentionContent(jobIntentionModule.content) : null

  const educationModules = moduleMap.get('education') || []
  const internshipModules = moduleMap.get('internship') || []
  const workExperienceModules = moduleMap.get('work_experience') || []
  const projectModules = moduleMap.get('project') || []
  const paperModules = moduleMap.get('paper') || []
  const researchModules = moduleMap.get('research') || []
  const awardModules = moduleMap.get('award') || []

  const empty = modules.length === 0

  if (empty) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
        <div className="text-center py-16 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-base font-medium">侧边聚焦</p>
          <p className="text-sm mt-1">请添加模块后预览</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto overflow-hidden">
      <div className="flex">
        <div className="w-[36%] min-w-0 bg-primary-50/50 border-r border-gray-100 px-6 py-8 space-y-6">
          {basicInfo && (
            <div>
              {basicInfo.name && (
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{basicInfo.name}</h1>
              )}
              {(jobIntention?.targetPosition || basicInfo.jobIntention) && (
                <p className="mt-1 text-sm font-medium text-primary-600">
                  {jobIntention?.targetPosition || basicInfo.jobIntention}
                </p>
              )}
            </div>
          )}

          {basicInfo && (basicInfo.email || basicInfo.phone || basicInfo.wechat || basicInfo.github || basicInfo.blog) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                联系方式
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {basicInfo.email && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{basicInfo.email}</span>
                  </li>
                )}
                {basicInfo.phone && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="truncate">{basicInfo.phone}</span>
                  </li>
                )}
                {basicInfo.wechat && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">{basicInfo.wechat}</span>
                  </li>
                )}
                {basicInfo.github && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">{basicInfo.github}</span>
                  </li>
                )}
                {basicInfo.blog && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="truncate">{basicInfo.blog}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {skillContent && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {getModuleDisplayLabel('skill')}
              </h3>
              {skillContent.categories.map((category, ci) => (
                <div key={ci} className={ci > 0 ? 'mt-3' : ''}>
                  {category.name && (
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{category.name}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {category.items.map((item, ii) => (
                      <span
                        key={ii}
                        className="inline-block text-xs px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {basicInfo && (basicInfo.hometown || basicInfo.workYears || basicInfo.isPartyMember) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                基本信息
              </h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {basicInfo.hometown && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{basicInfo.hometown}</span>
                  </li>
                )}
                {basicInfo.workYears && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{basicInfo.workYears}</span>
                  </li>
                )}
                {basicInfo.isPartyMember && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span>党员</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {jobIntention && (jobIntention.targetCity || jobIntention.salaryRange || jobIntention.expectedEntryDate) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {getModuleDisplayLabel('job_intention')}
              </h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {jobIntention.targetCity && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{jobIntention.targetCity}</span>
                  </li>
                )}
                {jobIntention.salaryRange && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{jobIntention.salaryRange}</span>
                  </li>
                )}
                {jobIntention.expectedEntryDate && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{jobIntention.expectedEntryDate}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 px-6 py-8 space-y-6">
          {basicInfo?.summary && (
            <div>
              <p className="text-sm text-gray-600 leading-relaxed">{basicInfo.summary}</p>
            </div>
          )}

          {educationModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('education')}</SectionHeading>
          )}
          {educationModules.map((mod) => {
            const edu = normalizeEducationContent(mod.content)
            return (
              <div key={mod.id} className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{edu.school}</span>
                    {edu.major && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-700">{edu.major}</span>
                      </>
                    )}
                  </div>
                  {(edu.startDate || edu.endDate) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {edu.startDate} - {edu.endDate}
                    </span>
                  )}
                </div>
                {edu.degree && (
                  <p className="text-sm text-gray-500 mt-0.5">{edu.degree}</p>
                )}
                {edu.department && (
                  <p className="text-sm text-gray-500">{edu.department}</p>
                )}
              </div>
            )
          })}

          {internshipModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('internship')}</SectionHeading>
          )}
          {internshipModules.map((mod) => {
            const exp = normalizeInternshipContent(mod.content)
            return (
              <div key={mod.id} className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{exp.company}</span>
                    {exp.position && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-700">{exp.position}</span>
                      </>
                    )}
                  </div>
                  {(exp.startDate || exp.endDate) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {exp.startDate} - {exp.endDate}
                    </span>
                  )}
                </div>
                {exp.projectDescription && (
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-2">{exp.projectDescription}</p>
                )}
                {exp.responsibilities.length > 0 && (
                  <ul className="space-y-1">
                    {exp.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-primary-400 mt-1 shrink-0">-</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {exp.techStack && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exp.techStack.split(',').map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-50 rounded text-gray-500 border border-gray-100">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {workExperienceModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('work_experience')}</SectionHeading>
          )}
          {workExperienceModules.map((mod) => {
            const exp = normalizeInternshipContent(mod.content)
            return (
              <div key={mod.id} className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{exp.company}</span>
                    {exp.position && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-700">{exp.position}</span>
                      </>
                    )}
                  </div>
                  {(exp.startDate || exp.endDate) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {exp.startDate} - {exp.endDate}
                    </span>
                  )}
                </div>
                {exp.projectDescription && (
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-2">{exp.projectDescription}</p>
                )}
                {exp.responsibilities.length > 0 && (
                  <ul className="space-y-1">
                    {exp.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-primary-400 mt-1 shrink-0">-</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}

          {projectModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('project')}</SectionHeading>
          )}
          {projectModules.map((mod) => {
            const project = normalizeProjectContent(mod.content)
            return (
              <div key={mod.id} className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{project.projectName}</span>
                    {project.role && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-700">{project.role}</span>
                      </>
                    )}
                  </div>
                  {(project.startDate || project.endDate) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {project.startDate} - {project.endDate}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-2">{project.description}</p>
                )}
                {project.achievements.length > 0 && (
                  <ul className="space-y-1">
                    {project.achievements.map((a, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-primary-400 mt-1 shrink-0">-</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {project.techStack && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {project.techStack.split(',').map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-50 rounded text-gray-500 border border-gray-100">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {paperModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('paper')}</SectionHeading>
          )}
          {paperModules.map((mod) => {
            const paper = normalizePaperContent(mod.content)
            return (
              <div key={mod.id} className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{paper.journalName || '未命名论文'}</span>
                  {paper.publishTime && (
                    <span className="text-xs text-gray-400 shrink-0">{paper.publishTime}</span>
                  )}
                </div>
                {paper.journalType && (
                  <span className="inline-block text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded mt-1">
                    {paper.journalType}
                  </span>
                )}
                {paper.content && (
                  <p className="text-sm text-gray-600 mt-1">{paper.content}</p>
                )}
              </div>
            )
          })}

          {researchModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('research')}</SectionHeading>
          )}
          {researchModules.map((mod) => {
            const research = normalizeResearchContent(mod.content)
            return (
              <div key={mod.id} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{research.projectName || '未命名研究'}</span>
                  {research.projectCycle && (
                    <span className="text-xs text-gray-400 shrink-0">{research.projectCycle}</span>
                  )}
                </div>
                {research.background && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-gray-500">背景：</span>
                    {research.background}
                  </p>
                )}
                {research.workContent && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-500">工作内容：</span>
                    {research.workContent}
                  </p>
                )}
                {research.achievements && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-500">成果：</span>
                    {research.achievements}
                  </p>
                )}
              </div>
            )
          })}

          {awardModules.length > 0 && (
            <SectionHeading>{getModuleDisplayLabel('award')}</SectionHeading>
          )}
          {awardModules.map((mod) => {
            const award = normalizeAwardContent(mod.content)
            return (
              <div key={mod.id} className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-700">- {award.awardName}</span>
                {award.awardTime && (
                  <span className="text-xs text-gray-400 shrink-0">{award.awardTime}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-800 pb-2 mb-3 border-b border-gray-100 flex items-center gap-2">
      <span className="w-1 h-4 bg-primary-500 rounded-full" />
      {children}
    </h2>
  )
}
