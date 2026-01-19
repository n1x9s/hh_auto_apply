import { useState } from "react"
import { useResumes } from "@/hooks/useResumes"
import {
  useSimilarVacancies,
  useSearchVacancies,
  useApplyToVacancy,
  useApplyBatch,
} from "@/hooks/useVacancies"
import { useUiStore } from "@/store/uiStore"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  MapPin,
  Building2,
  ExternalLink,
  Send,
  CheckSquare,
  Square,
} from "lucide-react"
import { formatSalary, formatDate } from "@/lib/utils"
import type { VacancyBrief } from "@/api/types"

function VacancyCard({
  vacancy,
  selected,
  onToggleSelect,
  onApply,
  applying,
}: {
  vacancy: VacancyBrief
  selected: boolean
  onToggleSelect: () => void
  onApply: () => void
  applying: boolean
}) {
  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <button
            onClick={onToggleSelect}
            className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground"
          >
            {selected ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold line-clamp-2">{vacancy.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{vacancy.employer?.name || "Компания"}</span>
                  {vacancy.employer?.trusted && (
                    <Badge variant="secondary" className="text-xs">
                      Проверен
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-medium text-green-600">
                  {formatSalary(
                    vacancy.salary?.from,
                    vacancy.salary?.to,
                    vacancy.salary?.currency
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {vacancy.area && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {vacancy.area.name}
                </div>
              )}
              {vacancy.remote && <Badge variant="outline">Удалённо</Badge>}
              {vacancy.experience && (
                <span>{vacancy.experience.replace("_", " ")}</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={onApply} disabled={applying}>
                <Send className="h-4 w-4 mr-2" />
                Откликнуться
              </Button>
              {vacancy.alternate_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(vacancy.alternate_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(vacancy.published_at)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VacanciesPage() {
  const [searchText, setSearchText] = useState("")
  const [activeTab, setActiveTab] = useState("similar")
  const [page, setPage] = useState(0)

  const { data: resumes } = useResumes()
  const {
    selectedResumeId,
    setSelectedResumeId,
    selectedVacancies,
    toggleVacancySelection,
    clearVacancySelection,
  } = useUiStore()

  const { data: similarData, isLoading: similarLoading } = useSimilarVacancies(
    activeTab === "similar" ? selectedResumeId : null,
    page
  )

  const { data: searchData, isLoading: searchLoading } = useSearchVacancies({
    text: activeTab === "search" ? searchText : undefined,
    page,
    per_page: 20,
  })

  const applyMutation = useApplyToVacancy()
  const applyBatchMutation = useApplyBatch()

  const vacancies =
    activeTab === "similar" ? similarData?.items : searchData?.items
  const totalPages =
    activeTab === "similar" ? similarData?.pages : searchData?.pages
  const isLoading = activeTab === "similar" ? similarLoading : searchLoading

  const handleApply = (vacancyId: number) => {
    if (!selectedResumeId) return
    applyMutation.mutate({
      vacancyId,
      resumeId: selectedResumeId,
    })
  }

  const handleApplyBatch = () => {
    if (!selectedResumeId || selectedVacancies.length === 0) return
    applyBatchMutation.mutate({
      vacancyIds: selectedVacancies,
      resumeId: selectedResumeId,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Вакансии</h2>
          <p className="text-muted-foreground">
            Поиск и отклик на вакансии
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Select
            value={selectedResumeId || ""}
            onValueChange={setSelectedResumeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите резюме" />
            </SelectTrigger>
            <SelectContent>
              {resumes?.map((resume) => (
                <SelectItem key={resume.id} value={resume.id}>
                  {resume.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVacancies.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Выбрано: {selectedVacancies.length}
            </Badge>
            <Button
              size="sm"
              onClick={handleApplyBatch}
              disabled={applyBatchMutation.isPending || !selectedResumeId}
            >
              <Send className="h-4 w-4 mr-2" />
              Откликнуться на все
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearVacancySelection}
            >
              Сбросить
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="similar">Похожие вакансии</TabsTrigger>
          <TabsTrigger value="search">Поиск</TabsTrigger>
        </TabsList>

        <TabsContent value="similar" className="mt-4">
          {!selectedResumeId ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Выберите резюме для поиска похожих вакансий
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : vacancies?.length ? (
            <div className="space-y-4">
              {vacancies.map((vacancy) => (
                <VacancyCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  selected={selectedVacancies.includes(vacancy.id)}
                  onToggleSelect={() => toggleVacancySelection(vacancy.id)}
                  onApply={() => handleApply(vacancy.id)}
                  applying={applyMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Похожие вакансии не найдены
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск вакансий..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setPage(0)}>Найти</Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : vacancies?.length ? (
            <div className="space-y-4">
              {vacancies.map((vacancy) => (
                <VacancyCard
                  key={vacancy.id}
                  vacancy={vacancy}
                  selected={selectedVacancies.includes(vacancy.id)}
                  onToggleSelect={() => toggleVacancySelection(vacancy.id)}
                  onApply={() => handleApply(vacancy.id)}
                  applying={applyMutation.isPending}
                />
              ))}
            </div>
          ) : searchText ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Вакансии не найдены
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      {totalPages && totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Назад
          </Button>
          <span className="flex items-center px-4">
            Страница {page + 1} из {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  )
}
