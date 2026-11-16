import { describe, it, expect } from 'vitest'
import { convertParsedResumeToImported, normalizeMonth } from '../utils/importers/pdf'
import type { ParsedResumeDTO } from '../types'

const baseDto: ParsedResumeDTO = {
  basicInfo: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '138-0013-8000',
    github: 'https://github.com/zhangsan',
    website: 'https://blog.zhangsan.dev',
    location: '上海',
    jobIntention: '后端开发工程师',
    workYears: '3年',
    summary: '踏实靠谱',
  },
}

describe('normalizeMonth', () => {
  it('归一化各种日期写法为 YYYY-MM', () => {
    expect(normalizeMonth('2021.9')).toBe('2021-09')
    expect(normalizeMonth('2021年9月')).toBe('2021-09')
    expect(normalizeMonth('2021-9')).toBe('2021-09')
    expect(normalizeMonth('2021/10')).toBe('2021-10')
    expect(normalizeMonth('2021-09')).toBe('2021-09')
  })

  it('“至今”类写法透传为“至今”', () => {
    expect(normalizeMonth('至今')).toBe('至今')
    expect(normalizeMonth('present')).toBe('至今')
    expect(normalizeMonth(' 现在 ')).toBe('至今')
  })

  it('非法输入返回空串', () => {
    expect(normalizeMonth('')).toBe('')
    expect(normalizeMonth(undefined)).toBe('')
    expect(normalizeMonth('不知道')).toBe('')
    expect(normalizeMonth('2021年13月')).toBe('')
  })
})

describe('convertParsedResumeToImported', () => {
  it('basicInfo：location 映射到 targetCity 而非 hometown，website 映射到 blog', () => {
    const result = convertParsedResumeToImported(baseDto, '张三_简历.pdf')

    const basic = result.modules.find((m) => m.moduleType === 'basic_info')
    expect(basic).toBeDefined()
    expect(basic!.content).toMatchObject({
      name: '张三',
      targetCity: '上海',
      hometown: '',
      blog: 'https://blog.zhangsan.dev',
      jobIntention: '后端开发工程师',
      workYears: '3年',
    })
    expect(result.title).toBe('张三')
  })

  it('educations：department 透传，日期归一化', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      educations: [
        { school: '清华大学', degree: '本科', major: '计算机', department: '计算机系', startDate: '2019.9', endDate: '2023年6月' },
      ],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')
    const edu = result.modules.find((m) => m.moduleType === 'education')

    expect(edu!.content).toMatchObject({
      school: '清华大学',
      department: '计算机系',
      major: '计算机',
      startDate: '2019-09',
      endDate: '2023-06',
    })
  })

  it('experiences：employmentType 优先决定模块类型', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      experiences: [
        { company: '字节跳动', position: '后端开发工程师', employmentType: 'full-time', startDate: '2023.7', endDate: '至今', description: '负责订单', achievements: ['a', 'b'] },
        { company: '美团', position: '到店实习工程师', employmentType: 'internship', startDate: '2022-01', endDate: '2022-06', description: '实习', achievements: [] },
        // 无 employmentType：靠“实习”字样
        { company: '腾讯', position: '日常实习生', startDate: '2021-01', endDate: '2021-06', description: '', achievements: [] },
      ],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')
    const types = result.modules
      .filter((m) => m.moduleType === 'internship' || m.moduleType === 'work_experience')
      .map((m) => m.moduleType)

    expect(types).toEqual(['work_experience', 'internship', 'internship'])
  })

  it('experiences：无信号时“至今”结束时间视为在职 → work_experience', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      experiences: [
        { company: '阿里云', position: '专家', startDate: '2020-01', endDate: 'present', description: '', achievements: [] },
      ],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')
    expect(result.modules.some((m) => m.moduleType === 'work_experience')).toBe(true)
  })

  it('experiences：achievements 缺失时从 description 提取条目', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      experiences: [
        {
          company: '京东',
          position: 'Java 开发',
          description: '主导重构\n1、订单模块拆分\n2、缓存命中率提升 20%',
          achievements: [],
        },
      ],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')
    // “开发”命中全职关键词 → work_experience
    const exp = result.modules.find(
      (m) => m.moduleType === 'work_experience' && (m.content as { company: string }).company === '京东',
    )

    expect(exp!.content).toMatchObject({
      responsibilities: ['订单模块拆分', '缓存命中率提升 20%'],
      projectDescription: '主导重构\n1、订单模块拆分\n2、缓存命中率提升 20%',
    })
  })

  it('awards/papers/researches 生成对应模块且日期归一化', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      awards: [{ awardName: '国家奖学金', awardTime: '2021年10月' }, { awardName: '', awardTime: '2020-01' }],
      papers: [{ journalType: 'SCI', journalName: 'TSE', publishTime: '2022.3', content: '论文A' }],
      researches: [{ projectName: '联邦学习课题', projectCycle: '2021-09 至 2023-06', background: '背景', workContent: '工作', achievements: '结题' }],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')

    const awards = result.modules.filter((m) => m.moduleType === 'award')
    expect(awards).toHaveLength(1) // 空 awardName 的条目被丢弃
    expect(awards[0].content).toEqual({ awardName: '国家奖学金', awardTime: '2021-10' })

    const paper = result.modules.find((m) => m.moduleType === 'paper')
    expect(paper!.content).toEqual({ journalType: 'SCI', journalName: 'TSE', publishTime: '2022-03', content: '论文A' })

    const research = result.modules.find((m) => m.moduleType === 'research')
    expect(research!.content).toEqual({
      projectName: '联邦学习课题',
      projectCycle: '2021-09 至 2023-06',
      background: '背景',
      workContent: '工作',
      achievements: '结题',
    })
  })

  it('skills：带“类别：”前缀的行拆出分组，无前缀保持旧行为', () => {
    const grouped: ParsedResumeDTO = {
      ...baseDto,
      skills: ['编程语言：熟练 Java、Go', '框架：Spring Boot、Dubbo', '数据库：MySQL、Redis'],
    }
    const groupedResult = convertParsedResumeToImported(grouped, 'a.pdf')
    const skillModule = groupedResult.modules.find((m) => m.moduleType === 'skill')
    expect(skillModule!.content).toEqual({
      categories: [
        { name: '编程语言', items: ['熟练 Java、Go'] },
        { name: '框架', items: ['Spring Boot、Dubbo'] },
        { name: '数据库', items: ['MySQL、Redis'] },
      ],
    })

    const plain: ParsedResumeDTO = { ...baseDto, skills: ['英语 CET-6', '驾照'] }
    const plainResult = convertParsedResumeToImported(plain, 'a.pdf')
    const plainSkill = plainResult.modules.find((m) => m.moduleType === 'skill')
    expect(plainSkill!.content).toEqual({ categories: [{ name: '', items: ['英语 CET-6', '驾照'] }] })
  })

  it('projects：techStack 数组拼接为斜杠分隔串', () => {
    const dto: ParsedResumeDTO = {
      ...baseDto,
      projects: [{ projectName: '订单中台', role: '核心开发', startDate: '2022.1', endDate: '至今', techStack: ['Java', 'Redis'], description: 'desc', achievements: ['x'] }],
    }
    const result = convertParsedResumeToImported(dto, 'a.pdf')
    const proj = result.modules.find((m) => m.moduleType === 'project')
    expect(proj!.content).toMatchObject({
      projectName: '订单中台',
      techStack: 'Java / Redis',
      startDate: '2022-01',
      endDate: '至今',
    })
  })

  it('无 basicInfo 时标题回退为文件名去后缀', () => {
    const result = convertParsedResumeToImported({ skills: ['x'] }, '李四_后端_简历.pdf')
    expect(result.title).toBe('李四_后端_简历')
  })
})
