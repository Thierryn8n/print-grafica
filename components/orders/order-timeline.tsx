"use client"

import type { ActivityLog, OrderStatus } from "@/lib/types"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/types"
import {
  FilePlus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Pencil,
  Upload,
  Clock,
  ArrowRight,
} from "lucide-react"
import { format, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns"
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

function formatDuration(startDate: Date, endDate: Date): string {
  const minutes = differenceInMinutes(endDate, startDate)
  const hours = differenceInHours(endDate, startDate)
  const days = differenceInDays(endDate, startDate)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}min`
  if (minutes > 0) return `${minutes}min`
  return "< 1min"
}

export function OrderTimeline({ entries, currentStatus }: { entries: ActivityLog[]; currentStatus?: OrderStatus }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Nenhuma atividade registrada ainda
      </div>
    )
  }

  // Group entries by status transitions
  const statusTransitions = entries.filter(e => e.action === 'status_changed')
  const otherActivities = entries.filter(e => e.action !== 'status_changed')

  return (
    <div className="space-y-6">
      {/* Status Timeline */}
      {statusTransitions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Timeline de Status</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {statusTransitions.map((entry, index) => {
                const nextEntry = statusTransitions[index + 1]
                const duration = nextEntry ? formatDuration(new Date(entry.created_at), new Date(nextEntry.created_at)) : null
                const Icon = ACTION_ICONS[entry.action] ?? Clock
                const color = ACTION_COLORS[entry.action] ?? "bg-muted-foreground"
                const userName = (entry.user as { full_name?: string } | undefined)?.full_name ?? "Sistema"
                
                return (
                  <div key={entry.id} className="relative pl-10">
                    <div className={`absolute left-0 w-8 h-8 rounded-full ${color} flex items-center justify-center ring-4 ring-background`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">
                          {entry.description || entry.action}
                        </p>
                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </time>
                      </div>
                      <p className="text-xs text-muted-foreground">por {userName}</p>
                      {duration && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tempo nesta etapa: {duration}
                        </p>
                      )}
                    </div>
                    {index < statusTransitions.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border -translate-x-1/2" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Other Activities */}
      {otherActivities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Outras Atividades</h3>
          <ol className="relative border-l border-border ml-3 space-y-5">
            {otherActivities.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] ?? Clock
              const color = ACTION_COLORS[entry.action] ?? "bg-muted-foreground"
              const userName = (entry.user as { full_name?: string } | undefined)?.full_name ?? "Sistema"
              
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
                      {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </time>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">por {userName}</p>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
