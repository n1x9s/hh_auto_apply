import { apiGet, apiPost } from "./client"
import type { AuthStatus, UserInfo, SuccessResponse } from "./types"

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiGet<AuthStatus>("/auth/status")
}

export async function getCurrentUser(): Promise<UserInfo> {
  return apiGet<UserInfo>("/auth/me")
}

export async function refreshToken(): Promise<SuccessResponse> {
  return apiPost<SuccessResponse>("/auth/refresh")
}
