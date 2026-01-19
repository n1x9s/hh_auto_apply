import { create } from "zustand"

interface UiState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  selectedResumeId: string | null
  setSelectedResumeId: (id: string | null) => void
  selectedVacancies: number[]
  setSelectedVacancies: (ids: number[]) => void
  toggleVacancySelection: (id: number) => void
  clearVacancySelection: () => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  selectedResumeId: null,
  setSelectedResumeId: (selectedResumeId) => set({ selectedResumeId }),

  selectedVacancies: [],
  setSelectedVacancies: (selectedVacancies) => set({ selectedVacancies }),
  toggleVacancySelection: (id) =>
    set((state) => ({
      selectedVacancies: state.selectedVacancies.includes(id)
        ? state.selectedVacancies.filter((v) => v !== id)
        : [...state.selectedVacancies, id],
    })),
  clearVacancySelection: () => set({ selectedVacancies: [] }),
}))
