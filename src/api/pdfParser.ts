import axios from 'axios'
import type { ApiEnvelope } from './client'
import type { ParsedResumeDTO } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * PDF 简历解析 API
 * <p>
 * 注意：此接口使用 multipart/form-data 上传文件，
 * 需要独立的 axios 实例（不经过默认的 JSON 请求拦截器）
 */
export async function parseResumePdf(file: File): Promise<ParsedResumeDTO> {
  const formData = new FormData()
  formData.append('file', file)

  // 创建独立的 axios 实例用于文件上传
  const uploadClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // PDF 解析可能需要更长时间
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  // 附加认证 Token
  const token = localStorage.getItem('accessToken')
  if (token) {
    uploadClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const response = await uploadClient.post<ApiEnvelope<ParsedResumeDTO>>('/resume/parse', formData)

  if (response.data.code !== 200) {
    throw new Error(response.data.message || 'PDF 解析失败')
  }

  return response.data.data
}
