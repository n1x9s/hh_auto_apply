export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface AuthStatus {
  authenticated: boolean
  access_token_expires: string | null
  refresh_token_expires: string | null
}

export interface AuthURLResponse {
  url: string
}

export interface UserInfo {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  email: string | null
  phone: string | null
  is_employer: boolean
  is_applicant: boolean
  is_anonymous: boolean
}

export interface ResumeStatus {
  id: string
  name: string
}

export interface Resume {
  id: string
  title: string
  url: string | null
  alternate_url: string | null
  status: ResumeStatus | null
  can_publish_or_update: boolean
  total_views: number
  new_views: number
  created_at: string | null
  updated_at: string | null
}

export interface Salary {
  from: number | null
  to: number | null
  currency: string | null
  gross: boolean | null
}

export interface Area {
  id: number
  name: string
}

export interface Employer {
  id: number
  name: string
  trusted: boolean
  alternate_url: string | null
  logo_urls: Record<string, string> | null
}

export interface VacancyBrief {
  id: number
  name: string
  area: Area | null
  salary: Salary | null
  employer: Employer | null
  alternate_url: string | null
  published_at: string | null
  created_at: string | null
  remote: boolean
  experience: string | { id?: string; name?: string } | null
  has_test: boolean
  response_letter_required: boolean
}

export interface Vacancy extends VacancyBrief {
  description: string | null
  key_skills: Array<{ name: string }> | null
  branded_description: string | null
  schedule: { id: string; name: string } | null
  employment: { id: string; name: string } | null
  professional_roles: Array<{ id: string; name: string }> | null
}

export interface NegotiationState {
  id: string
  name: string
}

export interface NegotiationBrief {
  id: number
  state: NegotiationState | null
  vacancy: VacancyBrief | null
  created_at: string | null
  updated_at: string | null
  has_updates: boolean
  url: string | null
}

export interface Negotiation extends NegotiationBrief {
  resume_id: string | null
  messages_url: string | null
}

export interface Message {
  id: string
  text: string
  created_at: string
  author: { participant_type: string } | null
  read: boolean
  state: { id: string; name: string } | null
  address: unknown | null
}

export interface EmployerFull {
  id: number
  name: string
  type: string | null
  description: string | null
  site_url: string | null
  alternate_url: string | null
  area: Area | null
  trusted: boolean
  blacklisted: boolean
  vacancies_url: string | null
}

export interface Contact {
  id: number | null
  vacancy_id: number
  vacancy_name: string | null
  employer_id: number | null
  employer_name: string | null
  full_name: string | null
  email: string | null
  phones: Array<{ formatted?: string; number?: string }> | null
  created_at: string | null
}

export interface Setting {
  key: string
  value: unknown
}

export interface DashboardStats {
  total_resumes: number
  active_resumes: number
  total_negotiations: number
  active_negotiations: number
  invitations: number
  discarded: number
  total_employers: number
  blacklisted_employers: number
  total_contacts: number
  total_vacancies_applied: number
  negotiations_today: number
  negotiations_this_week: number
}

export interface SuccessResponse {
  success: boolean
  message: string
}

export interface AutoApplyRequest {
  resume_id?: string | null
  message_template?: string | null
  use_ai?: boolean
  dry_run?: boolean
  total_pages?: number
  per_page?: number
}

export interface AutoApplyProgress {
  vacancy_id: number
  vacancy_name: string
  vacancy_url: string | null
  employer_name: string | null
  status: "applied" | "skipped" | "failed"
  reason: string | null
}

export interface AutoApplyResponse {
  success: boolean
  applied_count: number
  skipped_count: number
  failed_count: number
  results: AutoApplyProgress[]
  message: string
}
