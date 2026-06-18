"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import {
  useAppStore,
  getPriorityLabel,
  getServiceLabel,
  getModelLabel,
  type Priority,
} from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Scissors, Tv, Clock, User, Package, History } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

const priorityOrder: Record<Priority, number> = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baixa: 3,
}

const priorityClasses: Record<Priority, string> = {
  urgente: "bg-destructive text-destructive-foreground",
  alta: "bg-warning text-background",
  normal: "bg-primary text-primary-foreground",
  baixa: "bg-muted text-muted-foreground",
}

export default function CosturaPage() {
  const { orders, hydrated, hydrate, updateOrder, designers } = useAppStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  const costuraOrders = useMemo(() => {
    return orders
      .filter((o) => o.productionStage === "costura")
      .sort((a, b) => {
        const p = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (p !== 0) return p
        const aT = a.sentToCosturaAt ? new Date(a.sentToCosturaAt).getTime() : 0
        const bT = b.sentToCosturaAt ? new Date(b.sentToCosturaAt).getTime() : 0
        return aT - bT
      })
  }, [orders])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" />
            Fila de Costura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos enviados para a costura, ordenados por prioridade. Ajuste a prioridade conforme necessário.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/telao" target="_blank">
            <Tv className="w-4 h-4" />
            Abrir Telão (TV)
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(["urgente", "alta", "normal", "baixa"] as Priority[]).map((p) => (
          <Card key={p}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{getPriorityLabel(p)}</p>
              <p className="text-2xl font-bold text-foreground">
                {costuraOrders.filter((o) => o.priority === p).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {costuraOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum pedido na fila de costura no momento.</p>
            <p className="text-sm">Repasse um pedido para a costura no Kanban ou no detalhe do pedido.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {costuraOrders.map((order, index) => {
            const designer = designers.find((d) => d.id === order.designerId)
            const lastPass = order.stageHistory?.[order.stageHistory.length - 1]
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{order.clientName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{order.teamName}</p>
                      </div>
                    </div>
                    <Badge className={priorityClasses[order.priority]}>
                      {getPriorityLabel(order.priority)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{getModelLabel(order.model)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-muted-foreground" />
                      <span>{getServiceLabel(order.serviceType)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{order.totalQuantity}</span>
                      <span className="text-muted-foreground">unidades</span>
                    </div>
                    {order.sentToCosturaAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(parseISO(order.sentToCosturaAt), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {designer && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Designer: {designer.name}
                        </span>
                      )}
                      {lastPass && (
                        <span className="flex items-center gap-1">
                          <History className="w-3 h-3" />
                          Enviado por {lastPass.byName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Prioridade:</span>
                      <Select
                        value={order.priority}
                        onValueChange={(value) => updateOrder(order.id, { priority: value as Priority })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgente">Urgente</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
