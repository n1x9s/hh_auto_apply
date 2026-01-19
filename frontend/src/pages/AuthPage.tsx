import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStatus, useCurrentUser } from "@/hooks/useAuth"
import { useAuthStore } from "@/store/authStore"
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
import { CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default function AuthPage() {
  const navigate = useNavigate()
  const { status, user } = useAuthStore()
  const { isLoading: statusLoading } = useAuthStatus()
  const { isLoading: userLoading } = useCurrentUser()

  useEffect(() => {
    if (status?.authenticated && user) {
      // Redirect to dashboard after successful auth
      const timer = setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, user, navigate])

  const isAuthenticated = status?.authenticated

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Авторизация HH</CardTitle>
          <CardDescription>
            Статус подключения к HeadHunter API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statusLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                {isAuthenticated ? (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <Badge variant="success" className="text-lg px-4 py-1">
                      Авторизован
                    </Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-red-500" />
                    <Badge variant="destructive" className="text-lg px-4 py-1">
                      Не авторизован
                    </Badge>
                  </>
                )}
              </div>

              {isAuthenticated && status && (
                <div className="space-y-2 text-sm">
                  {status.access_token_expires && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Access Token истекает:
                      </span>
                      <span>{formatDateTime(status.access_token_expires)}</span>
                    </div>
                  )}
                  {status.refresh_token_expires && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Refresh Token истекает:
                      </span>
                      <span>
                        {formatDateTime(status.refresh_token_expires)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {userLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : user ? (
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="font-medium">
                    {user.first_name} {user.last_name}
                    {user.middle_name && ` ${user.middle_name}`}
                  </div>
                  {user.email && (
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  )}
                </div>
              ) : null}

              {!isAuthenticated && (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground text-sm">
                    Для авторизации используйте CLI команду:
                  </p>
                  <code className="block p-3 rounded bg-muted text-sm font-mono">
                    hh-applicant-tool authorize
                  </code>
                  <p className="text-center text-muted-foreground text-xs">
                    После авторизации обновите эту страницу
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {isAuthenticated ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate("/dashboard")}
                  >
                    Перейти в дашборд
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Обновить статус
                  </Button>
                )}
              </div>

              <a
                href="https://hh.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть hh.ru
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
