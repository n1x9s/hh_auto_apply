import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getAuthStatus,
  getAuthURL,
  getCurrentUser,
  refreshToken,
  submitAuthCode,
} from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { useEffect } from "react"

export function useAuthStatus() {
  const { setStatus, setLoading } = useAuthStore()

  const query = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  useEffect(() => {
    if (query.data) {
      setStatus(query.data)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, setStatus, setLoading])

  return query
}

export function useCurrentUser() {
  const { setUser } = useAuthStore()

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  useEffect(() => {
    if (query.data) {
      setUser(query.data)
    }
  }, [query.data, setUser])

  return query
}

export function useAuthURL(enabled = true) {
  return useQuery({
    queryKey: ["auth", "url"],
    queryFn: getAuthURL,
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  })
}

export function useSubmitAuthCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitAuthCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })
}

export function useRefreshToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })
}
