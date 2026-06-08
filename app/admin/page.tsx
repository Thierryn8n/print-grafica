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
  ArrowRight,
  DollarSign,
  Wallet,
  Receipt
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  fetchExpenses,
  fetchRevenues,
  computeSummary,
  computeMonthlySeries,
  formatCurrency,
  type FinanceSummary,
  type MonthlyPoint,
} from "@/lib/finance/finance-service"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { OrdersStatusChart } from "@/components/dashboard/orders-status-chart"
import { TopClientsChart } from "@/components/dashboard/top-clients-chart"
import { TopProductsChart } from "@/components/dashboard/top-products-chart"
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart"
import { CRMConversionChart } from "@/components/dashboard/crm-conversion-chart"
import { DesignerComparisonChart } from "@/components/dashboard/designer-comparison-chart"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    pendingApprovals: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [topClients, setTopClients] = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; count: number }[]>([])
  const [timeMetrics, setTimeMetrics] = useState({
    avgTimePerStage: 0,
    avgTotalTime: 0,
    designerStats: [] as { name: string; avgTime: number }[]
  })
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; orders: number; revenue: number }[]>([])
  const [crmConversion, setCrmConversion] = useState<{ name: string; value: number; color: string }[]>([])
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([])
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
        activeClients: 0,
        inactiveClients: 0,
        pendingApprovals: 0
      })
      setRecentOrders(orders.slice(0, 5))
      setAllOrders(orders)

      // Calculate top clients by revenue
      const clientRevenue: Record<string, number> = {}
      orders.forEach(order => {
        if (order.client_name && order.total_value) {
          clientRevenue[order.client_name] = (clientRevenue[order.client_name] || 0) + (order.total_value || 0)
        }
      })
      const topClientsData = Object.entries(clientRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
      setTopClients(topClientsData)

      // Calculate top products by quantity
      const productCount: Record<string, number> = {}
      orders.forEach(order => {
        if (order.product_type) {
          productCount[order.product_type] = (productCount[order.product_type] || 0) + order.quantity
        }
      })
      const topProductsData = Object.entries(productCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      setTopProducts(topProductsData)
    }

    // Calculate time metrics from activity logs
    const { data: activityLogs } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("action", "status_changed")
      .order("created_at", { ascending: true })

    if (activityLogs && activityLogs.length > 0) {
      // Calculate average time per stage
      const stageTimes: Record<string, number[]> = {}
      const orderTotalTimes: Record<string, { start: Date; end: Date }> = {}
      
      activityLogs.forEach(log => {
        if (log.order_id) {
          if (!orderTotalTimes[log.order_id]) {
            orderTotalTimes[log.order_id] = { start: new Date(log.created_at), end: new Date(log.created_at) }
          } else {
            orderTotalTimes[log.order_id].end = new Date(log.created_at)
          }
          
          const description = log.description || log.action
          if (!stageTimes[description]) {
            stageTimes[description] = []
          }
        }
      })

      // Calculate average total time per order
      const totalTimes = Object.values(orderTotalTimes).map(({ start, end }) => 
        (end.getTime() - start.getTime()) / (1000 * 60 * 60) // hours
      )
      const avgTotalTimeHours = totalTimes.length > 0 
        ? totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length 
        : 0

      setTimeMetrics({
        avgTimePerStage: 0, // Will need more detailed calculation
        avgTotalTime: avgTotalTimeHours,
        designerStats: [] // Will need to join with orders to get designer info
      })

      // Calculate monthly trend
      const monthlyData: Record<string, { orders: number; revenue: number }> = {}
      orders.forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        if (!monthlyData[month]) {
          monthlyData[month] = { orders: 0, revenue: 0 }
        }
        monthlyData[month].orders++
        monthlyData[month].revenue += order.total_value || 0
      })
      const monthlyTrendData = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, orders: data.orders, revenue: data.revenue }))
        .slice(-6) // Last 6 months
      setMonthlyTrend(monthlyTrendData)

      // Calculate CRM conversion (mock data for now)
      setCrmConversion([
        { name: "Novos Leads", value: 45, color: "#3b82f6" },
        { name: "Em Negociação", value: 25, color: "#8b5cf6" },
        { name: "Convertidos", value: 20, color: "#10b981" },
        { name: "Perdidos", value: 10, color: "#ef4444" },
      ])
    }

    // Dados financeiros (não bloqueiam o dashboard em caso de erro)
    try {
      const [revenues, expenses] = await Promise.all([fetchRevenues(), fetchExpenses()])
      setFinance(computeSummary(revenues, expenses))
      setMonthly(computeMonthlySeries(revenues, expenses, 6))
    } catch (e) {
      console.log("[v0] erro ao carregar financeiro:", e)
    }

    // Get clients count
    const { data: clientsData, count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact" })

    // Calculate active vs inactive clients (clients with orders in last 90 days are active)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const activeClientIds = new Set(
      orders
        .filter(o => new Date(o.created_at) > ninetyDaysAgo)
        .map(o => o.client_id)
    )
    
    const activeClientsCount = clientsData?.filter(c => activeClientIds.has(c.id)).length || 0
    const inactiveClientsCount = (clientsCount || 0) - activeClientsCount

    setStats(prev => ({
      ...prev,
      totalClients: clientsCount || 0,
      activeClients: activeClientsCount,
      inactiveClients: inactiveClientsCount,
      pendingApprovals: pendingCount || 0
    }))

    // Get pending users
    const { data: pendingUsersData, count: pendingCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3)

    setStats(prev => ({
      ...prev,
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

      {/* KPIs Financeiros */}
      {finance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(finance.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(finance.totalExpense)}</p>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${finance.netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <TrendingUp className={`w-5 h-5 ${finance.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{formatCurrency(finance.netProfit)}</p>
                  <p className="text-xs text-muted-foreground">Lucro ({finance.margin.toFixed(0)}%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Link href="/admin/financeiro">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold truncate">{formatCurrency(finance.receivable)}</p>
                    <p className="text-xs text-muted-foreground">A Receber</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* KPIs Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Top Clientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Clientes (Faturamento)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{client.name}</span>
                    <span className="font-medium ml-2">{formatCurrency(client.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Produtos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Produtos (Quantidade)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{product.name}</span>
                    <span className="font-medium ml-2">{product.count} un</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clientes Ativos vs Inativos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Clientes Ativos vs Inativos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativos (90 dias)</span>
                <span className="text-sm font-bold text-green-600">{stats.activeClients}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats.totalClients > 0 ? (stats.activeClients / stats.totalClients) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Inativos</span>
                <span className="text-sm font-bold text-red-600">{stats.inactiveClients}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${stats.totalClients > 0 ? (stats.inactiveClients / stats.totalClients) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <RevenueChart data={monthly} />
        <OrdersStatusChart orders={allOrders} />
      </div>

      {/* Gráficos Avançados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <TopClientsChart data={topClients} />
        <TopProductsChart data={topProducts} />
      </div>

      {/* Gráficos Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <MonthlyTrendChart data={monthlyTrend} />
        <CRMConversionChart data={crmConversion} />
      </div>

      {/* Comparativo por Designer */}
      <DesignerComparisonChart data={timeMetrics.designerStats} />

      {/* Métricas de Tempo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Métricas de Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {timeMetrics.avgTotalTime > 0 ? `${timeMetrics.avgTotalTime.toFixed(1)}h` : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tempo Médio Total</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {timeMetrics.avgTimePerStage > 0 ? `${timeMetrics.avgTimePerStage.toFixed(1)}h` : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tempo Médio por Etapa</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {allOrders.filter(o => o.status === "finalizado").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pedidos Finalizados</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
