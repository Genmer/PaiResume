import axios from 'axios'
import type { ApiEnvelope } from './client'
import type { ParsedResumeDTO } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Word 简历解析 API
 */
export async function parseResumeWord(file: File): Promise<ParsedResumeDTO> {
  const formData = new FormData()
  formData.append('file', file)

  const uploadClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000, // Word 解析可能需要较长时间
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const token = localStorage.getItem('accessToken')
  if (token) {
    uploadClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const response = await uploadClient.post<ApiEnvelope<ParsedResumeDTO>>('/resume/parse-word', formData)

  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'Word 解析失败')
  }

  return response.data.data
}
