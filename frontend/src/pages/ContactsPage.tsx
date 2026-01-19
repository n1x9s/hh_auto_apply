import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/api/client"
import type { PaginatedResponse, Contact } from "@/api/types"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  Search,
  Download,
  Mail,
  Phone,
  Building2,
  Briefcase,
  RefreshCw,
} from "lucide-react"

function useContacts(params: { search?: string; page?: number }) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () =>
      apiGet<PaginatedResponse<Contact>>("/contacts", {
        search: params.search,
        page: params.page,
        per_page: 20,
      }),
    staleTime: 1000 * 60,
  })
}

function ContactCard({ contact }: { contact: Contact }) {
  const phones =
    contact.phones
      ?.map((p) => p.formatted || p.number)
      .filter(Boolean)
      .join(", ") || null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {contact.full_name && (
            <h3 className="font-semibold">{contact.full_name}</h3>
          )}

          <div className="space-y-2 text-sm">
            {contact.employer_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{contact.employer_name}</span>
              </div>
            )}

            {contact.vacancy_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="line-clamp-1">{contact.vacancy_name}</span>
              </div>
            )}

            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {phones && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${phones.split(",")[0]}`}
                  className="text-primary hover:underline"
                >
                  {phones}
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ContactsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)

  const { data, isLoading, refetch } = useContacts({
    search: search || undefined,
    page,
  })

  const handleExport = () => {
    const url = new URL("/api/contacts/export", window.location.origin)
    url.searchParams.set("format", "csv")
    window.open(url.toString(), "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Контакты</h2>
          <p className="text-muted-foreground">
            Контактная информация из вакансий
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button onClick={handleExport} disabled={!data?.total}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email или компании..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {data && (
          <span className="flex items-center text-sm text-muted-foreground">
            Всего: {data.total}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((contact, idx) => (
            <ContactCard key={contact.id || idx} contact={contact} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Контакты не найдены</p>
            <p className="text-sm mt-1">
              Контакты появятся после просмотра вакансий
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
