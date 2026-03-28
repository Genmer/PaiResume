import { create } from 'zustand'
import { resumeApi, type ResumeListItem, type ResumeModule } from '../api/resume'

interface ResumeState {
  resumeList: ResumeListItem[]
  currentResumeId: number | null
  modules: ResumeModule[]
  loading: boolean
  fetchResumeList: () => Promise<void>
  createResume: (title?: string) => Promise<ResumeListItem>
  deleteResume: (id: number) => Promise<void>
  fetchModules: (resumeId: number) => Promise<void>
  updateModuleContent: (resumeId: number, moduleId: number, content: Record<string, unknown>) => Promise<void>
  addModule: (resumeId: number, moduleType: string, content: Record<string, unknown>) => Promise<void>
  deleteModule: (resumeId: number, moduleId: number) => Promise<void>
  setCurrentResumeId: (id: number | null) => void
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumeList: [],
  currentResumeId: null,
  modules: [],
  loading: false,

  fetchResumeList: async () => {
    set({ loading: true })
    try {
      const { data: res } = await resumeApi.list()
      set({ resumeList: res.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createResume: async (title) => {
    const { data: res } = await resumeApi.create({ title })
    const newResume = res.data
    set((state) => ({ resumeList: [...state.resumeList, newResume] }))
    return newResume
  },

  deleteResume: async (id) => {
    await resumeApi.delete(id)
    set((state) => ({
      resumeList: state.resumeList.filter((r) => r.id !== id),
      currentResumeId: state.currentResumeId === id ? null : state.currentResumeId,
    }))
  },

  fetchModules: async (resumeId) => {
    set({ loading: true, currentResumeId: resumeId })
    try {
      const { data: res } = await resumeApi.getModules(resumeId)
      set({ modules: res.data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  updateModuleContent: async (resumeId, moduleId, content) => {
    await resumeApi.updateModule(resumeId, moduleId, content)
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId ? { ...m, content } : m
      ),
    }))
  },

  addModule: async (resumeId, moduleType, content) => {
    const { data: res } = await resumeApi.addModule(resumeId, { moduleType, content })
    set((state) => ({ modules: [...state.modules, res.data] }))
  },

  deleteModule: async (resumeId, moduleId) => {
    await resumeApi.deleteModule(resumeId, moduleId)
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== moduleId),
    }))
  },

  setCurrentResumeId: (id) => set({ currentResumeId: id }),
}))
