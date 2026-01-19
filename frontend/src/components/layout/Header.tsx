import { useAuthStore } from "@/store/authStore"
import { useCurrentUser, useRefreshToken } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, User, LogOut } from "lucide-react"
import { Link } from "react-router-dom"

export default function Header() {
  const { user, status } = useAuthStore()
  const { isLoading: userLoading } = useCurrentUser()
  const refreshMutation = useRefreshToken()

  const isAuthenticated = status?.authenticated

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">HH Applicant Tool</h1>
        {isAuthenticated ? (
          <Badge variant="success">Авторизован</Badge>
        ) : (
          <Badge variant="destructive">Не авторизован</Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                refreshMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Обновить токен
          </Button>
        )}

        {user && !userLoading ? (
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              {user.first_name} {user.last_name}
            </span>
          </div>
        ) : !isAuthenticated ? (
          <Link to="/auth">
            <Button variant="default" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Войти
            </Button>
          </Link>
        ) : null}
      </div>
    </header>
  )
}
