"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderStatus } from "@/lib/types"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/types"
import { 
  Package, 
  Calendar,
  MoreVertical,
  Eye,
  ChevronRight,
  Upload
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrderKanban } from "@/components/kanban/order-kanban"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ColorAnalysisPanel } from "@/components/color/ColorAnalysisPanel"

const COLUMNS: OrderStatus[] = ["em-criacao", "enviado-aprovacao", "aprovado", "enviado-producao"]

export default function DesignerKanbanPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeColumn, setActiveColumn] = useState<OrderStatus>("em-criacao")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("designer_id", user.id)
      .order("created_at", { ascending: false })

    if (ordersData) setOrders(ordersData)
    setLoading(false)
  }

  async function moveOrder(order: Order, newStatus: OrderStatus) {
    const supabase = createClient()

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    // gera token de aprovação ao mover para aprovação
    if (newStatus === "enviado-aprovacao" && !order.approval_token) {
      updateData.approval_token = crypto.randomUUID()
    }

    const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)

    if (!error) {
      await supabase.from("activity_logs").insert({
        order_id: order.id,
        action: "status_changed",
        description: `Status alterado de ${ORDER_STATUS_LABELS[order.status]} para ${ORDER_STATUS_LABELS[newStatus]}`,
      })
      await loadData()
    }
  }

  async function moveToApproval(order: Order) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("orders")
      .update({ 
        status: "enviado-aprovacao",
        approval_token: crypto.randomUUID(),
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)

    if (!error) {
      await supabase.from("activity_logs").insert({
        order_id: order.id,
        action: "sent_to_approval",
        description: "Enviado para aprovação do cliente"
      })
      await loadData()
      setSheetOpen(false)
    }
  }

  function getColumnOrders(status: OrderStatus) {
    return orders.filter(o => o.status === status)
  }

  function OrderCard({ order }: { order: Order }) {
    return (
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0" onClick={() => { setSelectedOrder(order); setSheetOpen(true) }}>
              <p className="text-xs text-muted-foreground">#{order.order_number}</p>
              <h4 className="font-medium text-sm truncate mt-0.5">{order.client_name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{order.product_type} • {order.quantity}un</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSelectedOrder(order); setSheetOpen(true) }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                {order.status === "em-criacao" && (
                  <DropdownMenuItem onClick={() => moveToApproval(order)}>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Enviar para Aprovação
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_COLORS[order.priority]} text-white`}>
              {PRIORITY_LABELS[order.priority]}
            </span>
            {order.deadline && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(order.deadline), "dd/MM")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Meu Kanban</h1>
        <p className="text-sm text-muted-foreground">
          <span className="hidden lg:inline">Arraste seus pedidos entre as colunas para mudar o status</span>
          <span className="lg:hidden">Toque em um pedido para ver detalhes</span>
        </p>
      </div>

      {/* Mobile: Tab navigation */}
      <div className="lg:hidden overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-2">
          {COLUMNS.map((status) => {
            const count = getColumnOrders(status).length
            return (
              <button
                key={status}
                onClick={() => setActiveColumn(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeColumn === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {ORDER_STATUS_LABELS[status]}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                    activeColumn === status
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-foreground/10"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile: Single column */}
      <div className="lg:hidden space-y-3">
        {getColumnOrders(activeColumn).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum pedido nesta etapa</p>
            </CardContent>
          </Card>
        ) : (
          getColumnOrders(activeColumn).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>

      {/* Desktop: Multi-column com drag-and-drop */}
      <div className="hidden lg:block">
        <OrderKanban
          orders={orders}
          columns={COLUMNS}
          onMove={(order, status) => moveOrder(order, status)}
          onSelect={(order) => {
            setSelectedOrder(order)
            setSheetOpen(true)
          }}
        />
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Pedido #{selectedOrder.order_number}</SheetTitle>
                <SheetDescription>Detalhes do pedido</SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-3 py-1 rounded-full text-white ${ORDER_STATUS_COLORS[selectedOrder.status]}`}>
                    {ORDER_STATUS_LABELS[selectedOrder.status]}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full text-white ${PRIORITY_COLORS[selectedOrder.priority]}`}>
                    {PRIORITY_LABELS[selectedOrder.priority]}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedOrder.client_name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Produto</p>
                    <p className="font-medium">{selectedOrder.product_type}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.quantity} unidades</p>
                  </div>

                  {selectedOrder.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Descrição</p>
                      <p className="text-sm">{selectedOrder.description}</p>
                    </div>
                  )}

                  {selectedOrder.deadline && (
                    <div>
                      <p className="text-xs text-muted-foreground">Prazo</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {selectedOrder.approval_token && selectedOrder.status === "enviado-aprovacao" && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Link de Aprovação do Cliente</p>
                      <p className="text-xs break-all text-primary">
                        {typeof window !== "undefined" && `${window.location.origin}/aprovacao/${selectedOrder.approval_token}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <ColorAnalysisPanel 
                    orderId={selectedOrder.id}
                    onAnalysisComplete={(results) => {
                      console.log('Análise de cores completada para pedido:', selectedOrder.id, results)
                    }}
                  />
                </div>

                {selectedOrder.status === "em-criacao" && (
                  <div className="pt-4 border-t space-y-2">
                    <Button className="w-full" onClick={() => moveToApproval(selectedOrder)}>
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Enviar para Aprovação
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
