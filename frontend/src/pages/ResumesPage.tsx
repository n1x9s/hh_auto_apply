import { useResumes, usePublishResume, usePublishAllResumes } from "@/hooks/useResumes"
import { useUiStore } from "@/store/uiStore"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Eye, ExternalLink, Check } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default function ResumesPage() {
  const { data: resumes, isLoading, refetch } = useResumes()
  const publishMutation = usePublishResume()
  const publishAllMutation = usePublishAllResumes()
  const { selectedResumeId, setSelectedResumeId } = useUiStore()

  const handlePublish = (resumeId: string) => {
    publishMutation.mutate(resumeId)
  }

  const handlePublishAll = () => {
    publishAllMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Резюме</h2>
          <p className="text-muted-foreground">
            Управление вашими резюме на HeadHunter
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Обновить
          </Button>
          <Button
            onClick={handlePublishAll}
            disabled={publishAllMutation.isPending || !resumes?.length}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                publishAllMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Поднять все
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : resumes?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className={`cursor-pointer transition-colors ${
                selectedResumeId === resume.id
                  ? "ring-2 ring-primary"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => setSelectedResumeId(resume.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{resume.title}</CardTitle>
                    <CardDescription>ID: {resume.id}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      resume.status?.id === "published"
                        ? "success"
                        : resume.status?.id === "blocked"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {resume.status?.name || "Неизвестно"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {resume.total_views} просмотров
                      {resume.new_views > 0 && (
                        <span className="text-green-600 ml-1">
                          (+{resume.new_views})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Обновлено: {formatDateTime(resume.updated_at)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePublish(resume.id)
                    }}
                    disabled={
                      !resume.can_publish_or_update || publishMutation.isPending
                    }
                  >
                    {resume.can_publish_or_update ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Поднять
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Актуально
                      </>
                    )}
                  </Button>
                  {resume.alternate_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(resume.alternate_url!, "_blank")
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть
                    </Button>
                  )}
                </div>

                {selectedResumeId === resume.id && (
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    Выбрано для поиска похожих вакансий
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Резюме не найдены. Создайте резюме на hh.ru
          </CardContent>
        </Card>
      )}
    </div>
  )
}
