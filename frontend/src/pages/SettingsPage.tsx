import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPut, apiDelete } from "@/api/client"
import type { Setting } from "@/api/types"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Database,
  FileJson,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<Setting[]>("/settings"),
    staleTime: 1000 * 60,
  })
}

function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => apiGet<Record<string, unknown>>("/config"),
    staleTime: 1000 * 60,
  })
}

function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiPut(`/settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast({ title: "Настройка сохранена" })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

function useDeleteSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (key: string) => apiDelete(`/settings/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast({ title: "Настройка удалена" })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

function useUpdateConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiPut(`/config/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] })
      toast({ title: "Конфиг обновлён" })
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

function SettingRow({
  setting,
  onSave,
  onDelete,
  isSaving,
}: {
  setting: Setting
  onSave: (value: unknown) => void
  onDelete: () => void
  isSaving: boolean
}) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.stringify(setting.value, null, 2)
    } catch {
      return String(setting.value)
    }
  })
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    try {
      const parsed = JSON.parse(value)
      onSave(parsed)
      setIsEditing(false)
    } catch {
      onSave(value)
      setIsEditing(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <div className="flex-1 min-w-0">
        <Label className="font-mono text-sm">{setting.key}</Label>
        {isEditing ? (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 font-mono text-sm"
            rows={3}
          />
        ) : (
          <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-auto max-h-24">
            {value}
          </pre>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {isEditing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Отмена
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Изменить
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function DatabaseSettings() {
  const { data: settings, isLoading, refetch } = useSettings()
  const updateMutation = useUpdateSetting()
  const deleteMutation = useDeleteSetting()

  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const handleAddSetting = () => {
    if (!newKey.trim()) return
    try {
      const parsed = JSON.parse(newValue)
      updateMutation.mutate(
        { key: newKey, value: parsed },
        {
          onSuccess: () => {
            setNewKey("")
            setNewValue("")
          },
        }
      )
    } catch {
      updateMutation.mutate(
        { key: newKey, value: newValue },
        {
          onSuccess: () => {
            setNewKey("")
            setNewValue("")
          },
        }
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Настройки из базы данных (key-value)
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Добавить настройку</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Ключ</Label>
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="my_setting"
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label>Значение (JSON)</Label>
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder='"value" или {"key": "value"}'
              className="mt-1"
            />
          </div>
          <Button
            className="self-end"
            onClick={handleAddSetting}
            disabled={!newKey.trim() || updateMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {settings?.length ? (
          settings.map((setting) => (
            <SettingRow
              key={setting.key}
              setting={setting}
              onSave={(value) =>
                updateMutation.mutate({ key: setting.key, value })
              }
              onDelete={() => deleteMutation.mutate(setting.key)}
              isSaving={updateMutation.isPending}
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Нет сохранённых настроек
          </p>
        )}
      </div>
    </div>
  )
}

function ConfigSettings() {
  const { data: config, isLoading, refetch } = useConfig()
  const updateMutation = useUpdateConfig()

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const handleEdit = (key: string, value: unknown) => {
    setEditingKey(key)
    try {
      setEditValue(JSON.stringify(value, null, 2))
    } catch {
      setEditValue(String(value))
    }
  }

  const handleSave = () => {
    if (!editingKey) return
    try {
      const parsed = JSON.parse(editValue)
      updateMutation.mutate(
        { key: editingKey, value: parsed },
        { onSuccess: () => setEditingKey(null) }
      )
    } catch {
      updateMutation.mutate(
        { key: editingKey, value: editValue },
        { onSuccess: () => setEditingKey(null) }
      )
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const configEntries = Object.entries(config || {})

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Конфигурация из config.json (токены скрыты)
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <div className="space-y-4">
        {configEntries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex-1 min-w-0">
              <Label className="font-mono text-sm">{key}</Label>
              {editingKey === key ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="mt-2 font-mono text-sm"
                  rows={3}
                />
              ) : (
                <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-auto max-h-24">
                  {typeof value === "string" && value === "***"
                    ? "***"
                    : JSON.stringify(value, null, 2)}
                </pre>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {value !== "***" &&
                (editingKey === key ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingKey(null)}
                    >
                      Отмена
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(key, value)}
                  >
                    Изменить
                  </Button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Настройки</h2>
        <p className="text-muted-foreground">
          Управление конфигурацией приложения
        </p>
      </div>

      <Tabs defaultValue="database">
        <TabsList>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            База данных
          </TabsTrigger>
          <TabsTrigger value="config">
            <FileJson className="h-4 w-4 mr-2" />
            Конфиг
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-6">
          <DatabaseSettings />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ConfigSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
