import { useState } from "react"
import { useResumes } from "@/hooks/useResumes"
import {
  useSimilarVacancies,
  useSearchVacancies,
  useApplyToVacancy,
  useApplyBatch,
  useAutoApply,
} from "@/hooks/useVacancies"
import type { AutoApplyResponse } from "@/api/types"
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
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatSalary, formatDate } from "@/lib/utils"
import type { VacancyBrief } from "@/api/types"

function formatExperience(
  experience: VacancyBrief["experience"]
): string | null {
  if (!experience) return null
  if (typeof experience === "string") return experience.replace("_", " ")
  return experience.name || experience.id || null
}

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
  const experience = formatExperience(vacancy.experience)

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
              {experience && <span>{experience}</span>}
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

  // Auto-apply state
  const [autoApplyOpen, setAutoApplyOpen] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [messageTemplate, setMessageTemplate] = useState("")
  const [totalPages2, setTotalPages2] = useState(5)
  const [autoApplyResult, setAutoApplyResult] =
    useState<AutoApplyResponse | null>(null)

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
  const autoApplyMutation = useAutoApply()

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

  const handleAutoApply = () => {
    autoApplyMutation.mutate(
      {
        resume_id: selectedResumeId || undefined,
        dry_run: dryRun,
        message_template: messageTemplate || undefined,
        total_pages: totalPages2,
        per_page: 50,
      },
      {
        onSuccess: (data) => {
          setAutoApplyResult(data)
        },
      }
    )
  }

  const resetAutoApply = () => {
    setAutoApplyResult(null)
    setDryRun(true)
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
        <Dialog
          open={autoApplyOpen}
          onOpenChange={(open) => {
            setAutoApplyOpen(open)
            if (!open) resetAutoApply()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Автооткликов
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Автоматические отклики</DialogTitle>
              <DialogDescription>
                Автоматически откликнуться на все подходящие вакансии. Вакансии
                с тестами, в архиве и с перенаправлением будут пропущены.
              </DialogDescription>
            </DialogHeader>

            {!autoApplyResult ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Резюме</Label>
                  <Select
                    value={selectedResumeId || "all"}
                    onValueChange={(v) =>
                      setSelectedResumeId(v === "all" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все резюме" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все опубликованные</SelectItem>
                      {resumes?.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Страниц поиска (по 50 вакансий)</Label>
                  <Select
                    value={String(totalPages2)}
                    onValueChange={(v) => setTotalPages2(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (50 вакансий)</SelectItem>
                      <SelectItem value="3">3 (150 вакансий)</SelectItem>
                      <SelectItem value="5">5 (250 вакансий)</SelectItem>
                      <SelectItem value="10">10 (500 вакансий)</SelectItem>
                      <SelectItem value="20">20 (1000 вакансий)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Шаблон сообщения (для вакансий с обязательным письмом)</Label>
                  <Textarea
                    placeholder="Оставьте пустым для использования стандартного сообщения"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Тестовый режим (dry run)</Label>
                    <p className="text-sm text-muted-foreground">
                      Показать какие вакансии будут обработаны, не отправляя отклики
                    </p>
                  </div>
                  <Switch checked={dryRun} onCheckedChange={setDryRun} />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">
                        {autoApplyResult.applied_count}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dryRun ? "Будет отправлено" : "Отправлено"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">
                        {autoApplyResult.skipped_count}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Пропущено
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">
                        {autoApplyResult.failed_count}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ошибок
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <ScrollArea className="h-64 rounded-md border p-4">
                  <div className="space-y-2">
                    {autoApplyResult.results.map((result, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 py-2 border-b last:border-0"
                      >
                        {result.status === "applied" && (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                        {result.status === "skipped" && (
                          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                        {result.status === "failed" && (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-1">
                            {result.vacancy_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.employer_name}
                          </div>
                          {result.reason && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.reason}
                            </div>
                          )}
                        </div>
                        {result.vacancy_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(result.vacancy_url!, "_blank")
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              {!autoApplyResult ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setAutoApplyOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleAutoApply}
                    disabled={autoApplyMutation.isPending}
                  >
                    {autoApplyMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {dryRun ? "Проверить" : "Запустить"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={resetAutoApply}>
                    Назад
                  </Button>
                  {dryRun && autoApplyResult.applied_count > 0 && (
                    <Button
                      onClick={() => {
                        setAutoApplyResult(null)
                        autoApplyMutation.mutate(
                          {
                            resume_id: selectedResumeId || undefined,
                            dry_run: false,
                            message_template: messageTemplate || undefined,
                            total_pages: totalPages2,
                            per_page: 50,
                          },
                          {
                            onSuccess: (data) => {
                              setAutoApplyResult(data)
                              setDryRun(false)
                            },
                          }
                        )
                      }}
                      disabled={autoApplyMutation.isPending}
                    >
                      {autoApplyMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Отправить отклики
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setAutoApplyOpen(false)}
                  >
                    Закрыть
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
