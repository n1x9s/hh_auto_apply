import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getNegotiations,
  getNegotiation,
  getMessages,
  sendMessage,
  deleteNegotiation,
  type NegotiationListParams,
} from "@/api/negotiations"
import { toast } from "@/components/ui/use-toast"

export function useNegotiations(params: NegotiationListParams = {}) {
  return useQuery({
    queryKey: ["negotiations", params],
    queryFn: () => getNegotiations(params),
    staleTime: 1000 * 30, // 30 seconds
  })
}

export function useNegotiation(negotiationId: number | null) {
  return useQuery({
    queryKey: ["negotiation", negotiationId],
    queryFn: () => getNegotiation(negotiationId!),
    enabled: !!negotiationId,
  })
}

export function useMessages(negotiationId: number | null) {
  return useQuery({
    queryKey: ["messages", negotiationId],
    queryFn: () => getMessages(negotiationId!),
    enabled: !!negotiationId,
    staleTime: 1000 * 10, // 10 seconds
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      negotiationId,
      message,
    }: {
      negotiationId: number
      message: string
    }) => sendMessage(negotiationId, message),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.negotiationId],
      })
      toast({
        title: "Сообщение отправлено",
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

export function useDeleteNegotiation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNegotiation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["negotiations"] })
      toast({
        title: "Отклик отменён",
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
