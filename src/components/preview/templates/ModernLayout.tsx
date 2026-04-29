import type { ResumeModule } from '../../../api/resume'
import {
  normalizeAwardContent,
  normalizeBasicInfoContent,
  normalizeEducationContent,
  normalizeInternshipContent,
  normalizePaperContent,
  normalizeProjectContent,
  normalizeResearchContent,
  normalizeSkillContent,
} from '../../../utils/moduleContent'
import { normalizePhotoSource } from '../../../utils/resumePhoto'

interface ModernLayoutProps {
  modules: ResumeModule[]
}

function formatMonth(value: string) {
  if (!value) return ''
  const [year, month] = value.split('-')
  if (!year || !month) return value
  return `${year}年${Number(month)}月`
}

function formatMonthRange(start: string, end: string) {
  const startText = formatMonth(start)
  const endText = formatMonth(end)
  if (startText && endText) return `${startText} - ${endText}`
  return startText || endText
}

function formatYearDisplay(value: string) {
  if (!value) return ''
  const [year] = value.split('-')
  return year ? `${year}年` : value
}

function renderBulletItem(text: string, key: string | number) {
  return (
    <div key={key} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
      <span>{text}</span>
    </div>
  )
}

export function ModernLayout({ modules }: ModernLayoutProps) {
  const sorted = [...modules].sort((a, b) => {
    if (a.sortOrder === b.sortOrder) return a.id - b.id
    return a.sortOrder - b.sortOrder
  })

  const basicInfoModule = sorted.find((m) => m.moduleType === 'basic_info')
  const basicInfoContent = basicInfoModule
    ? normalizeBasicInfoContent(basicInfoModule.content)
    : null
  const photoSource = basicInfoContent ? normalizePhotoSource(basicInfoContent.photo) : null

  const educationModules = sorted.filter((m) => m.moduleType === 'education')
  const internshipModules = sorted.filter(
    (m) => m.moduleType === 'internship' || m.moduleType === 'work_experience'
  )
  const projectModules = sorted.filter((m) => m.moduleType === 'project')
  const skillModule = sorted.find((m) => m.moduleType === 'skill')
  const paperModules = sorted.filter((m) => m.moduleType === 'paper')
  const researchModules = sorted.filter((m) => m.moduleType === 'research')
  const awardModules = sorted.filter((m) => m.moduleType === 'award')

  const skillContent = skillModule ? normalizeSkillContent(skillModule.content) : null

  const contactItems: Array<{ label: string; value: string }> = []
  if (basicInfoContent) {
    if (basicInfoContent.email) contactItems.push({ label: '邮箱', value: basicInfoContent.email })
    if (basicInfoContent.phone) contactItems.push({ label: '手机', value: basicInfoContent.phone })
    if (basicInfoContent.targetCity) contactItems.push({ label: '城市', value: basicInfoContent.targetCity })
    if (basicInfoContent.github) contactItems.push({ label: 'GitHub', value: basicInfoContent.github })
    if (basicInfoContent.blog) contactItems.push({ label: '博客', value: basicInfoContent.blog })
    if (basicInfoContent.workYears) contactItems.push({ label: '工作年限', value: basicInfoContent.workYears })
  }

  const empty = sorted.length === 0

  const hasContent =
    basicInfoContent ||
    educationModules.length > 0 ||
    internshipModules.length > 0 ||
    projectModules.length > 0 ||
    skillContent ||
    paperModules.length > 0 ||
    researchModules.length > 0 ||
    awardModules.length > 0

  return (
    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-10 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(99,102,241,0.15)_0%,_transparent_50%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
        <div className="relative z-10 flex items-start gap-8">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-white tracking-tight">
                {basicInfoContent?.name || '姓名'}
              </h1>
              {basicInfoContent?.jobIntention && (
                <p className="text-xl text-indigo-300 font-medium">
                  {basicInfoContent.jobIntention}
                </p>
              )}
            </div>

            {contactItems.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {contactItems.map((item) => (
                  <span key={item.label} className="text-sm text-slate-300 flex items-center gap-1.5">
                    <span className="text-indigo-400">{item.label}</span>
                    <span className="text-slate-100">{item.value}</span>
                  </span>
                ))}
              </div>
            )}

            {basicInfoContent?.summary && (
              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl border-t border-white/10 pt-3 mt-3">
                {basicInfoContent.summary}
              </p>
            )}
          </div>

          {photoSource && (
            <div className="shrink-0">
              <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <img src={photoSource} alt="照片" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-10 py-8 space-y-8">
        {empty ? (
          <div className="text-center py-12 text-gray-400">
            <p>暂无简历内容，请添加模块后预览</p>
          </div>
        ) : null}

        {/* Education */}
        {educationModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              教育背景
            </h2>
            <div className="space-y-4">
              {educationModules.map((eduModule) => {
                const edu = normalizeEducationContent(eduModule.content)
                const tags = [
                  edu.is985 ? '985' : '',
                  edu.is211 ? '211' : '',
                  edu.isDoubleFirst ? '双一流' : '',
                ].filter(Boolean)
                return (
                  <div key={eduModule.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{edu.school || '学校'}</h3>
                        {tags.map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {[edu.department, edu.major, edu.degree].filter(Boolean).join(' / ')}
                      </p>
                    </div>
                    {(edu.startDate || edu.endDate) && (
                      <span className="text-sm text-gray-400 shrink-0">
                        {formatMonthRange(edu.startDate, edu.endDate)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Internship & Work */}
        {internshipModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              工作经历
            </h2>
            <div className="space-y-6">
              {internshipModules.map((mod) => {
                const exp = normalizeInternshipContent(mod.content)
                const title = [exp.company, exp.position].filter(Boolean).join(' - ')
                return (
                  <div key={mod.id} className="relative pl-5 border-l-2 border-indigo-100">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-indigo-400 -translate-x-[5px]" />
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-semibold text-gray-900">{title || '职位'}</h3>
                      {(exp.startDate || exp.endDate) && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatMonthRange(exp.startDate, exp.endDate)}
                        </span>
                      )}
                    </div>
                    {exp.projectName && (
                      <p className="text-sm text-indigo-600 font-medium mb-1">{exp.projectName}</p>
                    )}
                    {exp.projectDescription && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">{exp.projectDescription}</p>
                    )}
                    {exp.techStack && (
                      <p className="text-xs text-gray-400 mb-2">
                        <span className="font-medium text-gray-500">技术栈：</span>{exp.techStack}
                      </p>
                    )}
                    {exp.responsibilities.length > 0 && (
                      <div className="space-y-1.5">
                        {exp.responsibilities.map((resp, i) => renderBulletItem(resp, `${mod.id}-resp-${i}`))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Projects */}
        {projectModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              项目经历
            </h2>
            <div className="space-y-6">
              {projectModules.map((mod) => {
                const proj = normalizeProjectContent(mod.content)
                const title = [proj.projectName, proj.role].filter(Boolean).join(' - ')
                return (
                  <div key={mod.id} className="relative pl-5 border-l-2 border-indigo-100">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-indigo-400 -translate-x-[5px]" />
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-semibold text-gray-900">{title || '项目'}</h3>
                      {(proj.startDate || proj.endDate) && (
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatMonthRange(proj.startDate, proj.endDate)}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">{proj.description}</p>
                    )}
                    {proj.techStack && (
                      <p className="text-xs text-gray-400 mb-2">
                        <span className="font-medium text-gray-500">技术栈：</span>{proj.techStack}
                      </p>
                    )}
                    {proj.achievements.length > 0 && (
                      <div className="space-y-1.5">
                        {proj.achievements.map((ach, i) => renderBulletItem(ach, `${mod.id}-ach-${i}`))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Skills */}
        {skillContent && skillContent.categories.some((c) => c.items.length > 0) && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              专业技能
            </h2>
            <div className="space-y-3">
              {skillContent.categories
                .filter((c) => c.items.some((i) => i.trim()))
                .map((cat, ci) => (
                  <div key={ci} className="flex items-start gap-3">
                    {cat.name.trim() && (
                      <span className="text-sm font-medium text-gray-700 shrink-0 min-w-[5em]">{cat.name}</span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.filter((i) => i.trim()).map((item, ii) => (
                        <span
                          key={ii}
                          className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Research */}
        {researchModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              科研经历
            </h2>
            <div className="space-y-5">
              {researchModules.map((mod) => {
                const research = normalizeResearchContent(mod.content)
                return (
                  <div key={mod.id} className="relative pl-5 border-l-2 border-indigo-100">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-indigo-400 -translate-x-[5px]" />
                    <h3 className="font-semibold text-gray-900 mb-1">{research.projectName || '科研项目'}</h3>
                    {research.projectCycle && (
                      <p className="text-xs text-gray-400 mb-2">{research.projectCycle}</p>
                    )}
                    {research.background && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-1">
                        <span className="font-medium text-gray-500">背景：</span>{research.background}
                      </p>
                    )}
                    {research.workContent && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-1">
                        <span className="font-medium text-gray-500">工作：</span>{research.workContent}
                      </p>
                    )}
                    {research.achievements && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-500">成果：</span>{research.achievements}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Papers */}
        {paperModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              论文发表
            </h2>
            <div className="space-y-3">
              {paperModules.map((mod) => {
                const paper = normalizePaperContent(mod.content)
                return (
                  <div key={mod.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{paper.journalName || '论文'}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {[paper.journalType, paper.publishTime].filter(Boolean).join(' / ')}
                      </p>
                      {paper.content && (
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-3">{paper.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Awards */}
        {awardModules.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 mb-4 bg-indigo-50 inline-block px-3 py-1 rounded-md">
              获奖情况
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {awardModules.map((mod) => {
                const award = normalizeAwardContent(mod.content)
                return (
                  <div key={mod.id} className="flex items-center gap-1.5">
                    <span className="text-amber-500">&#9733;</span>
                    <span className="text-sm text-gray-700">{award.awardName || '奖项'}</span>
                    {award.awardTime && (
                      <span className="text-xs text-gray-400">({formatYearDisplay(award.awardTime)})</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {!hasContent && !empty && (
          <div className="text-center py-12 text-gray-400">
            <p>请填写模块内容后预览</p>
          </div>
        )}
      </div>
    </div>
  )
}
