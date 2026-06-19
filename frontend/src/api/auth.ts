import { apiGet, apiPost } from "./client"
import type { AuthStatus, AuthURLResponse, UserInfo, SuccessResponse } from "./types"

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiGet<AuthStatus>("/auth/status")
}

export async function getAuthURL(): Promise<AuthURLResponse> {
  return apiGet<AuthURLResponse>("/auth/url")
}

export async function submitAuthCode(value: string): Promise<SuccessResponse> {
  const trimmed = value.trim()
  const payload = trimmed.startsWith("http")
    ? { url: trimmed }
    : { code: trimmed }
  return apiPost<SuccessResponse>("/auth/code", payload)
}

export async function getCurrentUser(): Promise<UserInfo> {
  return apiGet<UserInfo>("/auth/me")
}

export async function refreshToken(): Promise<SuccessResponse> {
  return apiPost<SuccessResponse>("/auth/refresh")
}
