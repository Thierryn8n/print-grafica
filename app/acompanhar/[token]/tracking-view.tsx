"use client"

import { getTrackingStep, TRACKING_ORDER, TRACKING_STEPS, PRIORITY_LABEL } from "@/lib/order-tracking"
import { CheckCircle2, Circle, Package, Phone, Calendar, Hash, AlertTriangle } from "lucide-react"

type TrackingOrder = {
  order_number: string | null
  status: string
  client_name: string | null
  title: string | null
  quantity: number | null
  priority: string | null
  product_type: string | null
  total_value: number | null
  down_payment_percent: number | null
  paid_value: number | null
  payment_status: string | null
  due_date: string | null
  created_at: string | null
  updated_at: string | null
  company_name: string | null
  company_logo_url: string | null
  company_phone: string | null
}

function currency(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

export function TrackingView({ order }: { order: TrackingOrder }) {
  const step = getTrackingStep(order.status)
  const StepIcon = step.icon

  const total = order.total_value ?? 0
  const pct = order.down_payment_percent ?? 50
  const downPayment = total * (pct / 100)
  const paid = order.paid_value ?? 0
  const remaining = Math.max(0, total - paid)

  // Índice da etapa atual na linha do tempo principal
  const currentIndex = TRACKING_ORDER.indexOf(order.status)
  const isUrgent = order.priority === "urgente"

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header com a marca da loja */}
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
            {order.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.company_logo_url || "/placeholder.svg"}
                alt={order.company_name ?? "Logo"}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package className="h-6 w-6 text-sidebar" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{order.company_name ?? "Acompanhe seu pedido"}</h1>
            <p className="text-xs text-sidebar-foreground/70">Acompanhamento do pedido</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Identificação do pedido */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Olá, {order.client_name ?? "cliente"}</p>
              <p className="text-lg font-semibold text-foreground text-pretty">
                {order.title || order.product_type || "Seu pedido"}
              </p>
            </div>
            {order.order_number && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                <Hash className="h-3.5 w-3.5" />
                {order.order_number}
              </span>
            )}
          </div>
        </div>

        {isUrgent && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive text-sm">Urgência ⚠️</p>
              <p className="text-sm text-muted-foreground">
                Seu pedido foi marcado como urgente e terá prioridade no atendimento. Estamos
                acompanhando para agilizar o máximo possível.
              </p>
            </div>
          </div>
        )}

        {/* Status atual em destaque */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <StepIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {step.label} <span aria-hidden>{step.emoji}</span>
          </h2>
          <p className="mt-2 text-muted-foreground text-balance leading-relaxed">{step.description}</p>

          {/* Barra de progresso */}
          <div className="mt-5">
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(step.progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {Math.round(step.progress * 100)}% concluído
            </p>
          </div>
        </div>

        {/* Linha do tempo das etapas */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Etapas do pedido</h3>
          <ol className="space-y-1">
            {TRACKING_ORDER.map((key, idx) => {
              const s = TRACKING_STEPS[key]
              const done = currentIndex >= 0 && idx < currentIndex
              const active = currentIndex === idx
              const isLast = idx === TRACKING_ORDER.length - 1
              return (
                <li key={key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                    ) : active ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Circle className="h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                    )}
                    {!isLast && (
                      <div className={`w-0.5 flex-1 min-h-6 ${done ? "bg-success" : "bg-border"}`} />
                    )}
                  </div>
                  <div className={`pb-4 ${active ? "" : "opacity-70"}`}>
                    <p className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                      {s.label} <span aria-hidden>{s.emoji}</span>
                    </p>
                    {active && (
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Resumo do pedido + valores */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Resumo</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Quantidade</p>
              <p className="font-medium text-foreground">{order.quantity ?? "—"} un.</p>
            </div>
            <div>
              <p className="text-muted-foreground">Prioridade</p>
              <p className="font-medium text-foreground">{PRIORITY_LABEL[order.priority ?? ""] ?? "—"}</p>
            </div>
            <div className="flex items-start gap-2 col-span-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Previsão de entrega</p>
                <p className="font-medium text-foreground">{formatDate(order.due_date)}</p>
              </div>
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor total</span>
                <span className="text-2xl font-bold text-primary">{currency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entrada ({pct}%)</span>
                <span className="font-semibold text-success">{currency(downPayment)}</span>
              </div>
              {paid > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Já pago</span>
                  <span className="font-medium text-foreground">{currency(paid)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Saldo restante</span>
                <span className="font-semibold text-foreground">{currency(remaining)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Contato da loja */}
        {order.company_phone && (
          <a
            href={`https://wa.me/55${order.company_phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-success/10 border border-success/30 px-4 py-3 text-success font-medium hover:bg-success/15 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Falar com {order.company_name ?? "a gráfica"}
          </a>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Atualizado em {order.updated_at ? formatDate(order.updated_at) : formatDate(order.created_at)}.
          Este link permanece ativo para você acompanhar seu pedido.
        </p>
      </main>
    </div>
  )
}
