"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { listOrders, totalSizes } from "@/lib/orders/orders-service"
import type { Order, OrderStatus } from "@/lib/types"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Package,
  FilePlus,
  Eye,
  Calendar,
  Loader2,
  Users,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const STATUS_OPTIONS: (OrderStatus | "all")[] = [
  "all",
  "briefing",
  "design",
  "aprovacao",
  "producao",
  "finalizado",
]

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<OrderStatus | "all">("all")
  const [priority, setPriority] = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listOrders({ search, status, priority })
    setOrders(data)
    setLoading(false)
  }, [search, status, priority])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const stats = STATUS_OPTIONS.filter((s) => s !== "all").map((s) => ({
    status: s as OrderStatus,
    count: orders.filter((o) => o.status === s).length,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os pedidos de produção
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/novo-pedido">
            <FilePlus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Link>
        </Button>
      </div>

      {/* Stats por status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(({ status: s, count }) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "all" : s)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              status === s ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${ORDER_STATUS_COLORS[s]}`} />
              <span className="text-xs text-muted-foreground truncate">
                {ORDER_STATUS_LABELS[s]}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{count}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente, equipe ou produto..."
            className="pl-9 h-11"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "Todos os status" : ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda prioridade</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum pedido encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const qty = totalSizes(order) || order.quantity
            return (
              <Link key={order.id} href={`/admin/pedidos/${order.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{order.order_number}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full text-white ${ORDER_STATUS_COLORS[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full text-white ${PRIORITY_COLORS[order.priority]}`}
                        >
                          {PRIORITY_LABELS[order.priority]}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground truncate mt-1">
                        {order.client_name}
                        {order.team_name ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            • {order.team_name}
                          </span>
                        ) : null}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {order.product_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {qty} un
                        </span>
                        {order.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(order.deadline), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {order.total_value != null && (
                        <p className="font-bold text-primary">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(order.total_value)}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                        <Eye className="w-3 h-3" /> Ver detalhes
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
