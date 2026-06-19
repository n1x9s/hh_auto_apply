import { create } from "zustand"
import type { AuthStatus, UserInfo } from "@/api/types"

interface AuthState {
  status: AuthStatus | null
  user: UserInfo | null
  isLoading: boolean
  setStatus: (status: AuthStatus | null) => void
  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: null,
  user: null,
  isLoading: true,
  setStatus: (status) => set({ status }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ status: null, user: null, isLoading: false }),
}))
