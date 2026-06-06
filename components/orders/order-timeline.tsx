"use client"

import type { ActivityLog } from "@/lib/types"
import {
  FilePlus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Pencil,
  Upload,
  Clock,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const ACTION_ICONS: Record<string, typeof Clock> = {
  order_created: FilePlus,
  status_changed: RefreshCw,
  order_approved: CheckCircle2,
  order_rejected: XCircle,
  comment_added: MessageSquare,
  order_updated: Pencil,
  file_uploaded: Upload,
}

const ACTION_COLORS: Record<string, string> = {
  order_created: "bg-blue-500",
  status_changed: "bg-purple-500",
  order_approved: "bg-green-500",
  order_rejected: "bg-red-500",
  comment_added: "bg-sky-500",
  order_updated: "bg-amber-500",
  file_uploaded: "bg-teal-500",
}

export function OrderTimeline({ entries }: { entries: ActivityLog[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Nenhuma atividade registrada ainda
      </div>
    )
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-5">
      {entries.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] ?? Clock
        const color = ACTION_COLORS[entry.action] ?? "bg-muted-foreground"
        const userName =
          (entry.user as { full_name?: string } | undefined)?.full_name ?? "Sistema"
        return (
          <li key={entry.id} className="ml-6">
            <span
              className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${color} ring-4 ring-background`}
            >
              <Icon className="w-3 h-3 text-white" />
            </span>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">
                {entry.description || entry.action}
              </p>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </time>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">por {userName}</p>
          </li>
        )
      })}
    </ol>
  )
}
