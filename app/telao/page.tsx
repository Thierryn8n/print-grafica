"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Scissors, Clock } from "lucide-react"

interface CosturaItem {
  id: string
  client_name: string
  title: string
  product_type: string
  quantity: number
  size_breakdown: Record<string, number> | null
  priority: "baixa" | "normal" | "alta" | "urgente"
  sent_to_costura_at: string | null
  deadline: string | null
}

const priorityConfig: Record<
  CosturaItem["priority"],
  { label: string; bar: string; badge: string }
> = {
  urgente: { label: "URGENTE", bar: "bg-destructive", badge: "bg-destructive text-destructive-foreground" },
  alta: { label: "ALTA", bar: "bg-warning", badge: "bg-warning text-background" },
  normal: { label: "NORMAL", bar: "bg-primary", badge: "bg-primary text-primary-foreground" },
  baixa: { label: "BAIXA", bar: "bg-muted-foreground", badge: "bg-muted text-foreground" },
}

const serviceLabels: Record<string, string> = {
  "camisa-time": "Camisa de Time",
  "camisa-promocional": "Camisa Promocional",
  abada: "Abadá",
  uniforme: "Uniforme",
  colete: "Colete",
  bandeira: "Bandeira",
  banner: "Banner",
  "arte-avulsa": "Arte Avulsa",
  mockup: "Mockup",
  outro: "Outro",
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}

export default function TelaoPage() {
  const [items, setItems] = useState<CosturaItem[]>([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const loadQueue = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("get_costura_queue")
    if (error) {
      console.log("[v0] erro ao carregar fila do telão:", error.message)
    } else if (data) {
      setItems(data as CosturaItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadQueue()
    const dataInterval = setInterval(loadQueue, 20000)
    const clockInterval = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(clockInterval)
    }
  }, [loadQueue])

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Scissors className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fila de Costura</h1>
            <p className="text-muted-foreground text-lg capitalize">{formatDate(now)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-bold tabular-nums">{formatTime(now)}</p>
          <p className="text-muted-foreground text-lg">{items.length} pedido(s) na fila</p>
        </div>
      </header>

      {/* Content */}
      <section className="flex-1 p-8">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-2xl">
            Carregando fila...
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Scissors className="w-20 h-20 text-muted-foreground/40 mb-6" />
            <p className="text-4xl font-bold text-muted-foreground">Nenhuma costura na fila</p>
            <p className="text-xl text-muted-foreground/70 mt-2">
              Os pedidos enviados para costura aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item, index) => {
              const cfg = priorityConfig[item.priority] ?? priorityConfig.normal
              const sizes = item.size_breakdown
                ? Object.entries(item.size_breakdown).filter(
                    ([k, v]) => k !== "outros" && typeof v === "number" && v > 0,
                  )
                : []
              return (
                <article
                  key={item.id}
                  className="relative rounded-2xl bg-card border border-border overflow-hidden flex flex-col"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${cfg.bar}`} />
                  <div className="p-6 pl-8 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-muted-foreground/60 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h2 className="text-2xl font-bold leading-tight text-balance">
                            {item.client_name}
                          </h2>
                          <p className="text-muted-foreground text-lg">{item.title}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-lg">
                      <span className="text-muted-foreground">
                        {serviceLabels[item.product_type] ?? item.product_type}
                      </span>
                      <span className="font-bold text-primary text-2xl">
                        {item.quantity} un.
                      </span>
                    </div>

                    {sizes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sizes.map(([size, qty]) => (
                          <span
                            key={size}
                            className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-base font-medium"
                          >
                            {size.toUpperCase()}: {qty}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.sent_to_costura_at && (
                      <div className="mt-auto flex items-center gap-2 text-muted-foreground text-base pt-2">
                        <Clock className="w-4 h-4" />
                        Na fila desde{" "}
                        {new Date(item.sent_to_costura_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
