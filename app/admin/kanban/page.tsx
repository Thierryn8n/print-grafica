"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderStatus, Profile } from "@/lib/types"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/types"
import { 
  Package, 
  Clock, 
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import Link from "next/link"

const COLUMNS: OrderStatus[] = ["briefing", "design", "aprovacao", "producao", "finalizado"]

export default function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [designers, setDesigners] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeColumn, setActiveColumn] = useState<OrderStatus>("briefing")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, designer:designer_id(*)")
      .order("created_at", { ascending: false })

    const { data: designersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "designer")
      .eq("status", "approved")

    if (ordersData) setOrders(ordersData)
    if (designersData) setDesigners(designersData)
    setLoading(false)
  }

  async function moveOrder(order: Order, newStatus: OrderStatus) {
    const supabase = createClient()
    
    const updateData: Partial<Order> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Generate approval token when moving to approval
    if (newStatus === "aprovacao" && !order.approval_token) {
      updateData.approval_token = crypto.randomUUID()
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id)

    if (!error) {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from("activity_logs").insert({
        order_id: order.id,
        user_id: user?.id ?? null,
        action: "status_changed",
        description: `Status alterado de ${ORDER_STATUS_LABELS[order.status]} para ${ORDER_STATUS_LABELS[newStatus]}`,
        metadata: { from: order.status, to: newStatus }
      })

      await loadData()
    }
  }

  async function deleteOrder(order: Order) {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return

    const supabase = createClient()
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", order.id)

    if (!error) {
      await loadData()
      setSheetOpen(false)
    }
  }

  function getColumnOrders(status: OrderStatus) {
    return orders.filter(o => o.status === status)
  }

  function OrderCard({ order }: { order: Order }) {
    const currentIndex = COLUMNS.indexOf(order.status)
    const canMoveBack = currentIndex > 0
    const canMoveForward = currentIndex < COLUMNS.length - 1

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
                {canMoveBack && (
                  <DropdownMenuItem onClick={() => moveOrder(order, COLUMNS[currentIndex - 1])}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Mover para {ORDER_STATUS_LABELS[COLUMNS[currentIndex - 1]]}
                  </DropdownMenuItem>
                )}
                {canMoveForward && (
                  <DropdownMenuItem onClick={() => moveOrder(order, COLUMNS[currentIndex + 1])}>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Mover para {ORDER_STATUS_LABELS[COLUMNS[currentIndex + 1]]}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => deleteOrder(order)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os pedidos entre as colunas
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/novo-pedido">Novo Pedido</Link>
        </Button>
      </div>

      {/* Mobile: Tab-like navigation */}
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

      {/* Mobile: Single column view */}
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

      {/* Desktop: Multi-column Kanban */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-4">
        {COLUMNS.map((status) => {
          const columnOrders = getColumnOrders(status)
          return (
            <div key={status} className="flex flex-col">
              <div className={`p-3 rounded-t-lg ${ORDER_STATUS_COLORS[status]}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white text-sm">
                    {ORDER_STATUS_LABELS[status]}
                  </h3>
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {columnOrders.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[300px]">
                {columnOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Order Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Pedido #{selectedOrder.order_number}</SheetTitle>
                <SheetDescription>
                  Detalhes do pedido
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
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
                    {selectedOrder.client_phone && (
                      <p className="text-sm text-muted-foreground">{selectedOrder.client_phone}</p>
                    )}
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
                      <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrder.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {selectedOrder.total_value && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-lg text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(selectedOrder.total_value)}
                      </p>
                    </div>
                  )}

                  {selectedOrder.approval_token && selectedOrder.status === "aprovacao" && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Link de Aprovação</p>
                      <p className="text-xs break-all text-primary">
                        {typeof window !== "undefined" && `${window.location.origin}/aprovacao/${selectedOrder.approval_token}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  {selectedOrder.status !== "finalizado" && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        const currentIndex = COLUMNS.indexOf(selectedOrder.status)
                        if (currentIndex < COLUMNS.length - 1) {
                          moveOrder(selectedOrder, COLUMNS[currentIndex + 1])
                          setSheetOpen(false)
                        }
                      }}
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Mover para {ORDER_STATUS_LABELS[COLUMNS[COLUMNS.indexOf(selectedOrder.status) + 1]]}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => deleteOrder(selectedOrder)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Pedido
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
