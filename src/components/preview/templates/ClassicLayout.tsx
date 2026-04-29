import type { Resume } from '../../../types'
import { normalizePhotoSource } from '../../../utils/resumePhoto'

interface ClassicLayoutProps {
  resume: Resume
}

export function ClassicLayout({ resume }: ClassicLayoutProps) {
  const { basicInfo, educations, skills, experiences } = resume
  const photoSource = normalizePhotoSource(basicInfo.photo)

  return (
    <div className="bg-white max-w-4xl mx-auto font-serif text-gray-900">
      <header className="text-center border-b-2 border-gray-900 pb-6 mb-6">
        <h1 className="text-3xl font-bold tracking-wide uppercase mb-3">
          {basicInfo.name || 'YOUR NAME'}
        </h1>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600">
          {basicInfo.email && <span>{basicInfo.email}</span>}
          {basicInfo.phone && <span>{basicInfo.phone}</span>}
          {basicInfo.location && <span>{basicInfo.location}</span>}
          {basicInfo.github && (
            <a
              href={basicInfo.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 underline"
            >
              {basicInfo.github}
            </a>
          )}
          {basicInfo.website && (
            <a
              href={basicInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 underline"
            >
              {basicInfo.website}
            </a>
          )}
        </div>
        {photoSource && (
          <div className="mt-4 flex justify-center">
            <img
              src={photoSource}
              alt="Photo"
              className="w-24 h-32 object-cover border border-gray-300"
            />
          </div>
        )}
        {basicInfo.summary && (
          <p className="mt-4 text-sm text-gray-700 leading-relaxed max-w-2xl mx-auto">
            {basicInfo.summary}
          </p>
        )}
      </header>

      <div className="space-y-6">
        {educations.length > 0 && (
          <section>
            <h2 className="text-base font-bold tracking-widest uppercase border-b border-gray-900 pb-1 mb-3">
              Education
            </h2>
            {educations.map((edu) => (
              <div key={edu.id} className="mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">{edu.school}</span>
                  <span className="text-sm text-gray-600">
                    {edu.startDate} - {edu.endDate}
                  </span>
                </div>
                <div className="text-sm text-gray-700 italic">
                  {edu.degree}{edu.major ? ` · ${edu.major}` : ''}
                </div>
                {edu.description && (
                  <p className="text-sm text-gray-600 mt-1">{edu.description}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section>
            <h2 className="text-base font-bold tracking-widest uppercase border-b border-gray-900 pb-1 mb-3">
              Skills
            </h2>
            <p className="text-sm text-gray-700">{skills.join(', ')}</p>
          </section>
        )}

        {experiences.length > 0 && (
          <section>
            <h2 className="text-base font-bold tracking-widest uppercase border-b border-gray-900 pb-1 mb-3">
              Experience
            </h2>
            {experiences.map((exp) => (
              <div key={exp.id} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">{exp.position}</span>
                  <span className="text-sm text-gray-600">
                    {exp.startDate} - {exp.endDate}
                  </span>
                </div>
                <div className="text-sm text-gray-700 italic mb-1">{exp.company}</div>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {exp.description}
                </p>
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                    {exp.achievements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {educations.length === 0 && skills.length === 0 && experiences.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No resume content available
          </div>
        )}
      </div>
    </div>
  )
}
