import client from './client'

export interface ResumeListItem {
  id: number
  title: string
  templateId: string
  createdAt: string
  updatedAt: string
}

export interface ResumeModule {
  id: number
  resumeId: number
  moduleType: string
  content: Record<string, unknown>
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const resumeApi = {
  list: () =>
    client.get<{ data: ResumeListItem[] }>('/resumes'),

  create: (data?: { title?: string; templateId?: string }) =>
    client.post<{ data: ResumeListItem }>('/resumes', data || {}),

  delete: (id: number) =>
    client.delete(`/resumes/${id}`),

  getModules: (resumeId: number) =>
    client.get<{ data: ResumeModule[] }>(`/resumes/${resumeId}/modules`),

  addModule: (resumeId: number, data: { moduleType: string; content: Record<string, unknown>; sortOrder?: number }) =>
    client.post<{ data: ResumeModule }>(`/resumes/${resumeId}/modules`, data),

  updateModule: (resumeId: number, moduleId: number, content: Record<string, unknown>) =>
    client.post<{ data: ResumeModule }>(`/resumes/${resumeId}/modules/${moduleId}/update`, { content }),

  deleteModule: (resumeId: number, moduleId: number) =>
    client.delete(`/resumes/${resumeId}/modules/${moduleId}`),

  aiOptimize: (resumeId: number, moduleId: number) =>
    client.post<{ data: { original: Record<string, unknown>; optimized: Record<string, unknown> } }>(
      `/resumes/${resumeId}/modules/${moduleId}/ai-optimize`
    ),
}
