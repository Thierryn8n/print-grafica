"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, ShoppingCart, TrendingUp } from "lucide-react"

export default function RelatoriosPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalClients: 0,
    totalDesigners: 0,
    totalValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [orders, clients, designers] = await Promise.all([
      supabase.from("orders").select("total_value").order("created_at", { ascending: false }),
      supabase.from("clients").select("*"),
      supabase.from("profiles").select("*").eq("role", "designer")
    ])

    const totalValue = orders.data?.reduce((sum, order) => sum + (order.total_value || 0), 0) || 0

    setStats({
      totalOrders: orders.data?.length || 0,
      totalClients: clients.data?.length || 0,
      totalDesigners: designers.data?.length || 0,
      totalValue
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Estatísticas e métricas do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Pedidos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Designers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDesigners}</div>
            <p className="text-xs text-muted-foreground">Designers ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Valor dos pedidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Gráfico de pedidos por status em desenvolvimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Gráfico de pedidos por mês em desenvolvimento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
