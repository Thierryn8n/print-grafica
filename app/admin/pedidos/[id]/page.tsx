"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  getOrder,
  getOrderTimeline,
  updateOrderStatus,
  logOrderActivity,
  deleteOrder,
  totalSizes,
} from "@/lib/orders/orders-service"
import type { Order, OrderStatus, ActivityLog } from "@/lib/types"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { OrderTimeline } from "@/components/orders/order-timeline"
import {
  ArrowLeft,
  ChevronRight,
  Trash2,
  Loader2,
  User,
  Phone,
  Package,
  Calendar,
  DollarSign,
  Palette,
  Send,
  Shirt,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const COLUMNS: OrderStatus[] = ["briefing", "design", "aprovacao", "producao", "finalizado"]

export default function PedidoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [timeline, setTimeline] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState("")

  const load = useCallback(async () => {
    const [o, t] = await Promise.all([getOrder(orderId), getOrderTimeline(orderId)])
    setOrder(o)
    setTimeline(t)
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function handleMove(newStatus: OrderStatus) {
    if (!order) return
    setSaving(true)
    const { error } = await updateOrderStatus(order, newStatus)
    if (!error) await load()
    setSaving(false)
  }

  async function handleComment() {
    if (!comment.trim() || !order) return
    setSaving(true)
    await logOrderActivity(order.id, "comment_added", comment.trim())
    setComment("")
    await load()
    setSaving(false)
  }

  async function handleDelete() {
    if (!order || !confirm("Tem certeza que deseja excluir este pedido?")) return
    const { error } = await deleteOrder(order.id)
    if (!error) router.push("/admin/pedidos")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild variant="outline" className="mt-4 bg-transparent">
          <Link href="/admin/pedidos">Voltar para pedidos</Link>
        </Button>
      </div>
    )
  }

  const currentIndex = COLUMNS.indexOf(order.status)
  const nextStatus = currentIndex < COLUMNS.length - 1 ? COLUMNS[currentIndex + 1] : null
  const qty = totalSizes(order) || order.quantity

  const sizes = [
    { label: "PP", value: order.size_pp },
    { label: "P", value: order.size_p },
    { label: "M", value: order.size_m },
    { label: "G", value: order.size_g },
    { label: "GG", value: order.size_gg },
    { label: "XG", value: order.size_xg },
    { label: "XGG", value: order.size_xgg },
    { label: "Infantil", value: order.size_infantil },
  ].filter((s) => s.value > 0)

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/pedidos">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">
              Pedido #{order.order_number}
            </h1>
            <span
              className={`text-xs px-3 py-1 rounded-full text-white ${ORDER_STATUS_COLORS[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full text-white ${PRIORITY_COLORS[order.priority]}`}
            >
              {PRIORITY_LABELS[order.priority]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Criado em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium text-foreground">{order.client_name}</p>
              {order.team_name && (
                <p className="text-sm text-muted-foreground">Equipe: {order.team_name}</p>
              )}
              {order.client_phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.client_phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Produto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shirt className="w-4 h-4 text-primary" />
                Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{order.product_type}</p>
                </div>
                {order.model && (
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="font-medium">{order.model}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="font-medium">{qty} un</p>
                </div>
              </div>

              {sizes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Grade de Tamanhos</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <div
                        key={s.label}
                        className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border border-border bg-muted/30"
                      >
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                        <span className="font-bold">{s.value}</span>
                      </div>
                    ))}
                  </div>
                  {order.size_custom && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Personalizado: {order.size_custom}
                    </p>
                  )}
                </div>
              )}

              {order.colors && (
                <div className="flex items-start gap-2 text-sm">
                  <Palette className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cores</p>
                    <p>{order.colors}</p>
                  </div>
                </div>
              )}

              {order.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm whitespace-pre-wrap">{order.description}</p>
                </div>
              )}

              {order.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico / Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicionar um comentário ao histórico..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleComment}
                  disabled={saving || !comment.trim()}
                  size="icon"
                  className="self-end h-10 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <OrderTimeline entries={timeline} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar de ações */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.deadline && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Prazo
                  </span>
                  <span className="font-medium">
                    {format(new Date(order.deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              {order.total_value != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Valor
                  </span>
                  <span className="font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(order.total_value)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" /> Itens
                </span>
                <span className="font-medium">{qty} un</span>
              </div>
              {order.designer && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Designer</span>
                  <span className="font-medium">{order.designer.full_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextStatus ? (
                <Button
                  className="w-full"
                  onClick={() => handleMove(nextStatus)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  Avançar para {ORDER_STATUS_LABELS[nextStatus]}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Pedido finalizado
                </p>
              )}
              {currentIndex > 0 && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleMove(COLUMNS[currentIndex - 1])}
                  disabled={saving}
                >
                  Voltar para {ORDER_STATUS_LABELS[COLUMNS[currentIndex - 1]]}
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Pedido
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
