import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  searchVacancies,
  getSimilarVacancies,
  getVacancy,
  applyToVacancy,
  applyBatch,
  type VacancySearchParams,
} from "@/api/vacancies"
import { toast } from "@/components/ui/use-toast"
import { useUiStore } from "@/store/uiStore"

export function useSearchVacancies(params: VacancySearchParams) {
  return useQuery({
    queryKey: ["vacancies", "search", params],
    queryFn: () => searchVacancies(params),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!params.text || !!params.area,
  })
}

export function useSimilarVacancies(resumeId: string | null, page = 0) {
  return useQuery({
    queryKey: ["vacancies", "similar", resumeId, page],
    queryFn: () => getSimilarVacancies(resumeId!, page),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!resumeId,
  })
}

export function useVacancy(vacancyId: number | null) {
  return useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => getVacancy(vacancyId!),
    enabled: !!vacancyId,
  })
}

export function useApplyToVacancy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      vacancyId,
      resumeId,
      message,
    }: {
      vacancyId: number
      resumeId: string
      message?: string
    }) => applyToVacancy(vacancyId, resumeId, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["negotiations"] })
      toast({
        title: data.success ? "Отклик отправлен" : "Ошибка",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

export function useApplyBatch() {
  const queryClient = useQueryClient()
  const { clearVacancySelection } = useUiStore()

  return useMutation({
    mutationFn: ({
      vacancyIds,
      resumeId,
      message,
      useAiMessage,
    }: {
      vacancyIds: number[]
      resumeId: string
      message?: string
      useAiMessage?: boolean
    }) => applyBatch(vacancyIds, resumeId, message, useAiMessage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["negotiations"] })
      clearVacancySelection()
      toast({
        title: data.success ? "Отклики отправлены" : "Ошибка",
        description: data.message,
      })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}
