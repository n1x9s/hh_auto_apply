import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getResumes, publishResume, publishAllResumes } from "@/api/resumes"
import { toast } from "@/components/ui/use-toast"

export function useResumes() {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: getResumes,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function usePublishResume() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishResume,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] })
      toast({
        title: data.success ? "Успешно" : "Ошибка",
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

export function usePublishAllResumes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishAllResumes,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] })
      toast({
        title: data.success ? "Успешно" : "Ошибка",
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
