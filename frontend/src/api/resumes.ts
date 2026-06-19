import { apiGet, apiPost } from "./client"
import type { Resume, SuccessResponse } from "./types"

export async function getResumes(): Promise<Resume[]> {
  return apiGet<Resume[]>("/resumes")
}

export async function publishResume(
  resumeId: string
): Promise<SuccessResponse> {
  return apiPost<SuccessResponse>(`/resumes/${resumeId}/publish`)
}

export async function publishAllResumes(): Promise<{
  success: boolean
  published: string[]
  failed: string[]
  message: string
}> {
  return apiPost("/resumes/publish-all")
}
