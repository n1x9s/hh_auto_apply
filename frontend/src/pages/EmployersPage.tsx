import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/api/client"
import type { PaginatedResponse, EmployerFull } from "@/api/types"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Building2,
  ExternalLink,
  Search,
  Ban,
  CheckCircle,
  RefreshCw,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

function useEmployers(params: {
  search?: string
  blacklisted?: boolean
  page?: number
}) {
  return useQuery({
    queryKey: ["employers", params],
    queryFn: () =>
      apiGet<PaginatedResponse<EmployerFull>>("/employers", {
        search: params.search,
        blacklisted: params.blacklisted,
        page: params.page,
        per_page: 20,
      }),
    staleTime: 1000 * 60,
  })
}

function useToggleBlacklist() {
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: (employerId: number) =>
      apiPost("/employers/blacklist", { employer_id: employerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast({ title: "Работодатель добавлен в чёрный список" })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (employerId: number) =>
      apiDelete(`/employers/blacklist/${employerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast({ title: "Работодатель удалён из чёрного списка" })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return { addMutation, removeMutation }
}

function EmployerCard({
  employer,
  onToggleBlacklist,
  isToggling,
}: {
  employer: EmployerFull
  onToggleBlacklist: () => void
  isToggling: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold line-clamp-1">{employer.name}</h3>
              {employer.trusted && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Проверен
                </Badge>
              )}
            </div>

            {employer.area && (
              <p className="text-sm text-muted-foreground mt-1">
                {employer.area.name}
              </p>
            )}

            {employer.type && (
              <p className="text-xs text-muted-foreground mt-1">
                {employer.type}
              </p>
            )}

            {employer.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {employer.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {employer.blacklisted ? (
              <Badge variant="destructive">
                <Ban className="h-3 w-3 mr-1" />
                В ЧС
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Switch
              id={`blacklist-${employer.id}`}
              checked={employer.blacklisted}
              onCheckedChange={onToggleBlacklist}
              disabled={isToggling}
            />
            <Label
              htmlFor={`blacklist-${employer.id}`}
              className="text-sm cursor-pointer"
            >
              Чёрный список
            </Label>
          </div>

          <div className="flex gap-2">
            {employer.site_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(employer.site_url!, "_blank")}
              >
                Сайт
              </Button>
            )}
            {employer.alternate_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(employer.alternate_url!, "_blank")}
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

export default function EmployersPage() {
  const [search, setSearch] = useState("")
  const [showBlacklisted, setShowBlacklisted] = useState<boolean | undefined>()
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useEmployers({
    search: search || undefined,
    blacklisted: showBlacklisted,
    page,
  })

  const { addMutation, removeMutation } = useToggleBlacklist()

  const handleToggleBlacklist = (employer: EmployerFull) => {
    if (employer.blacklisted) {
      removeMutation.mutate(employer.id)
    } else {
      addMutation.mutate(employer.id)
    }
  }

  const isToggling = addMutation.isPending || removeMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Работодатели</h2>
          <p className="text-muted-foreground">
            Управление списком работодателей
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск работодателей..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant={showBlacklisted === undefined ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowBlacklisted(undefined)}
          >
            Все
          </Button>
          <Button
            variant={showBlacklisted === false ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowBlacklisted(false)}
          >
            Обычные
          </Button>
          <Button
            variant={showBlacklisted === true ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowBlacklisted(true)}
          >
            <Ban className="h-4 w-4 mr-2" />
            Чёрный список
          </Button>
        </div>

        {data && (
          <span className="flex items-center text-sm text-muted-foreground">
            Всего: {data.total}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((employer) => (
            <EmployerCard
              key={employer.id}
              employer={employer}
              onToggleBlacklist={() => handleToggleBlacklist(employer)}
              isToggling={isToggling}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Работодатели не найдены</p>
            <p className="text-sm mt-1">
              Работодатели появятся после откликов на вакансии
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
    </div>
  )
}
