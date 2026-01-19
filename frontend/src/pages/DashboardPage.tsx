import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/api/client"
import type { DashboardStats } from "@/api/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText,
  MessageSquare,
  Building2,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"

function useDashboardStats() {
  return useQuery({
    queryKey: ["stats", "dashboard"],
    queryFn: () => apiGet<DashboardStats>("/stats/dashboard"),
    staleTime: 1000 * 60, // 1 minute
  })
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string
  value: number | string
  description?: string
  icon: React.ElementType
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Дашборд</h2>
        <p className="text-muted-foreground">
          Обзор вашей активности на HeadHunter
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Резюме"
          value={stats?.total_resumes ?? 0}
          description={`${stats?.active_resumes ?? 0} активных`}
          icon={FileText}
          loading={isLoading}
        />
        <StatCard
          title="Отклики"
          value={stats?.total_negotiations ?? 0}
          description={`${stats?.active_negotiations ?? 0} активных`}
          icon={MessageSquare}
          loading={isLoading}
        />
        <StatCard
          title="Приглашения"
          value={stats?.invitations ?? 0}
          icon={CheckCircle}
          loading={isLoading}
        />
        <StatCard
          title="Отказы"
          value={stats?.discarded ?? 0}
          icon={XCircle}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Работодатели"
          value={stats?.total_employers ?? 0}
          description={`${stats?.blacklisted_employers ?? 0} в чёрном списке`}
          icon={Building2}
          loading={isLoading}
        />
        <StatCard
          title="Контакты"
          value={stats?.total_contacts ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Откликов сегодня"
          value={stats?.negotiations_today ?? 0}
          icon={Clock}
          loading={isLoading}
        />
        <StatCard
          title="Откликов за неделю"
          value={stats?.negotiations_this_week ?? 0}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>Часто используемые функции</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/resumes"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Обновить резюме</div>
              <div className="text-sm text-muted-foreground">
                Поднять резюме в поиске
              </div>
            </a>
            <a
              href="/vacancies"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Найти вакансии</div>
              <div className="text-sm text-muted-foreground">
                Поиск и отклики на вакансии
              </div>
            </a>
            <a
              href="/negotiations"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Просмотреть отклики</div>
              <div className="text-sm text-muted-foreground">
                Чаты с работодателями
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика откликов</CardTitle>
            <CardDescription>Распределение по статусам</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Ожидают ответа</span>
                <span className="font-medium">
                  {stats?.active_negotiations ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Приглашения</span>
                <span className="font-medium text-green-600">
                  {stats?.invitations ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Отказы</span>
                <span className="font-medium text-red-600">
                  {stats?.discarded ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Всего вакансий</span>
                <span className="font-bold">
                  {stats?.total_vacancies_applied ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
