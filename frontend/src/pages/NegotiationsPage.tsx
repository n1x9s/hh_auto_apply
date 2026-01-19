import { useState } from "react"
import {
  useNegotiations,
  useMessages,
  useSendMessage,
  useDeleteNegotiation,
} from "@/hooks/useNegotiations"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageSquare,
  Building2,
  ExternalLink,
  Send,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { formatDateTime, formatSalary } from "@/lib/utils"
import type { NegotiationBrief } from "@/api/types"

const stateColors: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  response: "secondary",
  invitation: "success",
  interview: "success",
  discard: "destructive",
  hired: "success",
}

const stateLabels: Record<string, string> = {
  response: "Ожидает ответа",
  invitation: "Приглашение",
  interview: "Собеседование",
  discard: "Отказ",
  hired: "Принят",
}

function NegotiationCard({
  negotiation,
  onClick,
  onDelete,
}: {
  negotiation: NegotiationBrief
  onClick: () => void
  onDelete: () => void
}) {
  const stateId = negotiation.state?.id || "response"

  return (
    <Card
      className="cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-1">
              {negotiation.vacancy?.name || "Вакансия"}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                {negotiation.vacancy?.employer?.name || "Компания"}
              </span>
            </div>
            {negotiation.vacancy?.salary && (
              <div className="mt-1 text-sm text-green-600">
                {formatSalary(
                  negotiation.vacancy.salary.from,
                  negotiation.vacancy.salary.to,
                  negotiation.vacancy.salary.currency
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant={stateColors[stateId]}>
              {stateLabels[stateId] || negotiation.state?.name || "Неизвестно"}
            </Badge>
            {negotiation.has_updates && (
              <Badge variant="default" className="text-xs">
                Новое
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDateTime(negotiation.updated_at || negotiation.created_at)}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {negotiation.vacancy?.alternate_url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(negotiation.vacancy!.alternate_url!, "_blank")
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatDialog({
  negotiation,
  open,
  onClose,
}: {
  negotiation: NegotiationBrief | null
  open: boolean
  onClose: () => void
}) {
  const [message, setMessage] = useState("")
  const { data: messagesData, isLoading } = useMessages(
    open ? negotiation?.id ?? null : null
  )
  const sendMutation = useSendMessage()

  const handleSend = () => {
    if (!message.trim() || !negotiation) return
    sendMutation.mutate(
      { negotiationId: negotiation.id, message: message.trim() },
      {
        onSuccess: () => setMessage(""),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{negotiation?.vacancy?.name}</DialogTitle>
          <DialogDescription>
            {negotiation?.vacancy?.employer?.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-[300px] p-4 border rounded-lg">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-3/4" />
              ))}
            </div>
          ) : messagesData?.messages.length ? (
            <div className="space-y-4">
              {messagesData.messages.map((msg) => {
                const isEmployer =
                  msg.author?.participant_type === "employer"
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isEmployer ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isEmployer
                          ? "bg-muted"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isEmployer
                            ? "text-muted-foreground"
                            : "text-primary-foreground/70"
                        }`}
                      >
                        {formatDateTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              Нет сообщений
            </p>
          )}
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Textarea
            placeholder="Введите сообщение..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function NegotiationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [page, setPage] = useState(0)
  const [selectedNegotiation, setSelectedNegotiation] =
    useState<NegotiationBrief | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const { data, isLoading, refetch } = useNegotiations({
    status: statusFilter || undefined,
    page,
    per_page: 20,
  })

  const deleteMutation = useDeleteNegotiation()

  const handleOpenChat = (negotiation: NegotiationBrief) => {
    setSelectedNegotiation(negotiation)
    setChatOpen(true)
  }

  const handleDelete = (negotiationId: number) => {
    if (confirm("Отменить отклик?")) {
      deleteMutation.mutate(negotiationId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Отклики</h2>
          <p className="text-muted-foreground">
            Ваши отклики и переписка с работодателями
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="response">Ожидают ответа</SelectItem>
            <SelectItem value="invitation">Приглашения</SelectItem>
            <SelectItem value="discard">Отказы</SelectItem>
          </SelectContent>
        </Select>

        {data && (
          <span className="flex items-center text-sm text-muted-foreground">
            Всего: {data.total}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((negotiation) => (
            <NegotiationCard
              key={negotiation.id}
              negotiation={negotiation}
              onClick={() => handleOpenChat(negotiation)}
              onDelete={() => handleDelete(negotiation.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Откликов пока нет</p>
            <p className="text-sm mt-1">
              Откликнитесь на вакансии в разделе "Вакансии"
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Назад
          </Button>
          <span className="flex items-center px-4">
            Страница {page + 1} из {data.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pages - 1}
          >
            Вперёд
          </Button>
        </div>
      )}

      <ChatDialog
        negotiation={selectedNegotiation}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  )
}
