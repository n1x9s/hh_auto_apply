import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("ru-RU")
}

export function formatDateTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("ru-RU")
}

export function formatSalary(
  from?: number | null,
  to?: number | null,
  currency?: string | null
) {
  if (!from && !to) return "Не указана"
  const suffix = currency ? ` ${currency}` : ""
  if (from && to) return `${from.toLocaleString("ru-RU")} - ${to.toLocaleString("ru-RU")}${suffix}`
  if (from) return `от ${from.toLocaleString("ru-RU")}${suffix}`
  return `до ${to?.toLocaleString("ru-RU")}${suffix}`
}
