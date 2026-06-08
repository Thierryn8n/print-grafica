'use client'

import { useAppStore, getServiceLabel, getStatusLabel } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Truck
} from 'lucide-react'

export default function RelatoriosPage() {
  const { orders, designers } = useAppStore()

  // Calculate statistics
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => ['finalizado', 'entregue'].includes(o.status)).length
  const inProgressOrders = orders.filter(o => !['finalizado', 'entregue', 'novo-pedido'].includes(o.status)).length
  const totalQuantity = orders.reduce((acc, o) => acc + o.totalQuantity, 0)
  
  // Orders by service type
  const ordersByService = orders.reduce((acc, order) => {
    acc[order.serviceType] = (acc[order.serviceType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Orders by status
  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Orders by designer
  const ordersByDesigner = designers.map(d => ({
    name: d.name,
    total: orders.filter(o => o.designerId === d.id).length,
    completed: orders.filter(o => o.designerId === d.id && ['finalizado', 'entregue'].includes(o.status)).length
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Relatórios</h1>
        </div>
        <p className="text-muted-foreground">
          Visão geral da produção
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalOrders}</p>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{completedOrders}</p>
                <p className="text-sm text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{inProgressOrders}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Truck className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalQuantity}</p>
                <p className="text-sm text-muted-foreground">Peças Produzidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders by Service */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pedidos por Tipo de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(ordersByService)
                .sort((a, b) => b[1] - a[1])
                .map(([service, count]) => (
                  <div key={service} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          {getServiceLabel(service as any)}
                        </span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / totalOrders) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Designer */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Desempenho por Designer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ordersByDesigner.map((designer) => (
                <div key={designer.name} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {designer.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{designer.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{designer.total} pedidos</span>
                      <span className="text-green-600">{designer.completed} finalizados</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {designer.total > 0 ? Math.round((designer.completed / designer.total) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card className="glass border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pedidos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div key={status} className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getStatusLabel(status as any)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
