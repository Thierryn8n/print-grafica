"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { ProductionMetrics } from "@/lib/production/sla"
import { Package, AlertTriangle, Clock, CheckCircle2, TrendingUp, Timer } from "lucide-react"

interface ProductionMetricsBarProps {
  metrics: ProductionMetrics
}

export function ProductionMetricsBar({ metrics }: ProductionMetricsBarProps) {
  const cards = [
    {
      label: "Em produção",
      value: metrics.active,
      icon: Package,
      iconClass: "text-primary bg-primary/10",
    },
    {
      label: "Atrasados",
      value: metrics.overdue,
      icon: AlertTriangle,
      iconClass: "text-red-600 bg-red-50",
    },
    {
      label: "Vencendo",
      value: metrics.dueSoon,
      icon: Clock,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      label: "Finalizados",
      value: metrics.finished,
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "No prazo",
      value: metrics.onTimeRate !== null ? `${metrics.onTimeRate}%` : "—",
      icon: TrendingUp,
      iconClass: "text-sky-600 bg-sky-50",
    },
    {
      label: "Lead time médio",
      value: metrics.avgLeadTimeDays !== null ? `${metrics.avgLeadTimeDays}d` : "—",
      icon: Timer,
      iconClass: "text-violet-600 bg-violet-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card key={c.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{c.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
