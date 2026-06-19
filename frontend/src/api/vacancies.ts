import { apiGet, apiPost } from "./client"
import type {
  PaginatedResponse,
  Vacancy,
  VacancyBrief,
  SuccessResponse,
  AutoApplyRequest,
  AutoApplyResponse,
} from "./types"

export interface VacancySearchParams {
  text?: string
  area?: number
  salary?: number
  currency?: string
  experience?: string
  employment?: string
  schedule?: string
  order_by?: string
  page?: number
  per_page?: number
}

export async function searchVacancies(
  params: VacancySearchParams
): Promise<PaginatedResponse<VacancyBrief>> {
  return apiGet<PaginatedResponse<VacancyBrief>>("/vacancies/search", params as Record<string, string | number | boolean | undefined>)
}

export async function getSimilarVacancies(
  resumeId: string,
  page = 0,
  perPage = 20
): Promise<PaginatedResponse<VacancyBrief>> {
  return apiGet<PaginatedResponse<VacancyBrief>>(
    `/vacancies/similar/${resumeId}`,
    { page, per_page: perPage }
  )
}

export async function getVacancy(vacancyId: number): Promise<Vacancy> {
  return apiGet<Vacancy>(`/vacancies/${vacancyId}`)
}

export async function applyToVacancy(
  vacancyId: number,
  resumeId: string,
  message?: string
): Promise<SuccessResponse & { negotiation_id?: number }> {
  return apiPost(`/vacancies/${vacancyId}/apply`, {
    vacancy_id: vacancyId,
    resume_id: resumeId,
    message,
  })
}

export async function applyBatch(
  vacancyIds: number[],
  resumeId: string,
  message?: string,
  useAiMessage = false
): Promise<{
  success: boolean
  applied: number[]
  failed: Array<{ vacancy_id: number; error: string }>
  message: string
}> {
  return apiPost("/vacancies/apply-batch", {
    vacancy_ids: vacancyIds,
    resume_id: resumeId,
    message,
    use_ai_message: useAiMessage,
  })
}

export async function autoApply(
  request: AutoApplyRequest
): Promise<AutoApplyResponse> {
  return apiPost<AutoApplyResponse>("/vacancies/auto-apply", request)
}
