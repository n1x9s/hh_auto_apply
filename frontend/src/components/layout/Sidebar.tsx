import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  FileText,
  Search,
  MessageSquare,
  Building2,
  Users,
  Settings,
  ChevronLeft,
} from "lucide-react"
import { useUiStore } from "@/store/uiStore"

const navigation = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { name: "Резюме", href: "/resumes", icon: FileText },
  { name: "Вакансии", href: "/vacancies", icon: Search },
  { name: "Отклики", href: "/negotiations", icon: MessageSquare },
  { name: "Работодатели", href: "/employers", icon: Building2 },
  { name: "Контакты", href: "/contacts", icon: Users },
  { name: "Настройки", href: "/settings", icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useUiStore()

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {sidebarOpen && (
          <span className="font-semibold text-lg">HH Tool</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(!sidebarOpen && "mx-auto")}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              !sidebarOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    !sidebarOpen && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", sidebarOpen && "mr-3")} />
                  {sidebarOpen && item.name}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
