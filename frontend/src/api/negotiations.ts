import { apiGet, apiPost, apiDelete } from "./client"
import type {
  PaginatedResponse,
  NegotiationBrief,
  Negotiation,
  Message,
  SuccessResponse,
} from "./types"

export interface NegotiationListParams {
  status?: string
  page?: number
  per_page?: number
  order_by?: string
}

export async function getNegotiations(
  params: NegotiationListParams = {}
): Promise<PaginatedResponse<NegotiationBrief>> {
  return apiGet<PaginatedResponse<NegotiationBrief>>("/negotiations", params as Record<string, string | number | boolean | undefined>)
}

export async function getNegotiation(
  negotiationId: number
): Promise<Negotiation> {
  return apiGet<Negotiation>(`/negotiations/${negotiationId}`)
}

export async function getMessages(
  negotiationId: number
): Promise<{ messages: Message[]; found: number }> {
  return apiGet(`/negotiations/${negotiationId}/messages`)
}

export async function sendMessage(
  negotiationId: number,
  message: string
): Promise<SuccessResponse> {
  return apiPost(`/negotiations/${negotiationId}/messages`, { message })
}

export async function deleteNegotiation(
  negotiationId: number
): Promise<SuccessResponse> {
  return apiDelete(`/negotiations/${negotiationId}`)
}
