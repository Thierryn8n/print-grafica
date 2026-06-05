"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Order, Profile, Client } from "@/lib/types"
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PRIORITY_LABELS } from "@/lib/types"
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    totalClients: 0,
    pendingApprovals: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    const supabase = createClient()

    // Get orders stats
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (orders) {
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === "briefing" || o.status === "design").length,
        inProductionOrders: orders.filter(o => o.status === "producao").length,
        completedOrders: orders.filter(o => o.status === "finalizado").length,
        totalClients: 0,
        pendingApprovals: 0
      })
      setRecentOrders(orders.slice(0, 5))
    }

    // Get clients count
    const { count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })

    // Get pending users
    const { data: pendingUsersData, count: pendingCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3)

    setStats(prev => ({
      ...prev,
      totalClients: clientsCount || 0,
      pendingApprovals: pendingCount || 0
    }))

    if (pendingUsersData) {
      setPendingUsers(pendingUsersData)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do sistema
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProductionOrders}</p>
                <p className="text-xs text-muted-foreground">Em Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedOrders}</p>
                <p className="text-xs text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/admin/aprovacoes-usuarios">
          <Card className={stats.pendingApprovals > 0 ? "border-primary/50 bg-primary/5" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.pendingApprovals > 0 ? "bg-primary/20" : "bg-orange-500/10"}`}>
                  <AlertTriangle className={`w-5 h-5 ${stats.pendingApprovals > 0 ? "text-primary" : "text-orange-500"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground">Aguardando Aprovação</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Users Alert */}
      {pendingUsers.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Usuários Aguardando Aprovação
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/aprovacoes-usuarios" className="text-xs">
                  Ver todos
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Pedidos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/kanban" className="text-xs">
                Ver todos
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum pedido ainda</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/admin/novo-pedido">Criar primeiro pedido</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ORDER_STATUS_COLORS[order.status]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        #{order.order_number} - {order.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.product_type} • {order.quantity}un
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
