import type { Order, OrderStatus } from "@/lib/types"

export type SlaStatus = "no_prazo" | "atencao" | "atrasado" | "sem_prazo" | "concluido"

export interface SlaInfo {
  status: SlaStatus
  daysLeft: number | null // dias restantes (negativo = atrasado)
  label: string
  color: string // classe tailwind de cor de texto/fundo
  dotColor: string
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Calcula o status de SLA de um pedido com base no prazo de entrega.
 * - atrasado: prazo já passou
 * - atencao: faltam 2 dias ou menos
 * - no_prazo: mais de 2 dias
 */
export function getSlaInfo(order: Pick<Order, "deadline" | "status">): SlaInfo {
  if (order.status === "finalizado") {
    return {
      status: "concluido",
      daysLeft: null,
      label: "Concluído",
      color: "text-emerald-600 bg-emerald-50",
      dotColor: "bg-emerald-500",
    }
  }

  if (!order.deadline) {
    return {
      status: "sem_prazo",
      daysLeft: null,
      label: "Sem prazo",
      color: "text-muted-foreground bg-muted",
      dotColor: "bg-muted-foreground",
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(order.deadline)
  deadline.setHours(0, 0, 0, 0)

  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / MS_PER_DAY)

  if (daysLeft < 0) {
    return {
      status: "atrasado",
      daysLeft,
      label: `${Math.abs(daysLeft)}d atrasado`,
      color: "text-red-600 bg-red-50",
      dotColor: "bg-red-500",
    }
  }

  if (daysLeft <= 2) {
    return {
      status: "atencao",
      daysLeft,
      label: daysLeft === 0 ? "Vence hoje" : `${daysLeft}d restante${daysLeft > 1 ? "s" : ""}`,
      color: "text-amber-600 bg-amber-50",
      dotColor: "bg-amber-500",
    }
  }

  return {
    status: "no_prazo",
    daysLeft,
    label: `${daysLeft}d restantes`,
    color: "text-emerald-600 bg-emerald-50",
    dotColor: "bg-emerald-500",
  }
}

export interface ProductionMetrics {
  total: number
  active: number // não finalizados
  overdue: number // atrasados (ativos)
  dueSoon: number // atenção (ativos)
  finished: number
  byStatus: Record<OrderStatus, number>
  avgLeadTimeDays: number | null // tempo médio entre criação e finalização
  onTimeRate: number | null // % de pedidos ativos no prazo
}

const ALL_STATUSES: OrderStatus[] = ["briefing", "design", "aprovacao", "producao", "finalizado"]

export function computeProductionMetrics(orders: Order[]): ProductionMetrics {
  const byStatus = ALL_STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<OrderStatus, number>,
  )

  let overdue = 0
  let dueSoon = 0
  let finished = 0
  let active = 0
  let onTimeActive = 0

  // lead time (apenas finalizados com updated_at)
  let leadSum = 0
  let leadCount = 0

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
    const sla = getSlaInfo(o)

    if (o.status === "finalizado") {
      finished++
      const created = new Date(o.created_at).getTime()
      const done = new Date(o.updated_at).getTime()
      if (done >= created) {
        leadSum += (done - created) / MS_PER_DAY
        leadCount++
      }
    } else {
      active++
      if (sla.status === "atrasado") overdue++
      else if (sla.status === "atencao") dueSoon++
      else if (sla.status === "no_prazo" || sla.status === "sem_prazo") onTimeActive++
    }
  }

  return {
    total: orders.length,
    active,
    overdue,
    dueSoon,
    finished,
    byStatus,
    avgLeadTimeDays: leadCount > 0 ? Math.round((leadSum / leadCount) * 10) / 10 : null,
    onTimeRate: active > 0 ? Math.round((onTimeActive / active) * 100) : null,
  }
}
