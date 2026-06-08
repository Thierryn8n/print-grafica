'use client'

import { useAppStore, getStatusLabel, getServiceLabel } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Factory,
  Package,
  CheckCircle2,
  Printer,
  Scissors,
  Truck,
  Search,
  Calendar
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const productionStages = [
  { id: 'aprovado', label: 'Aprovado', icon: CheckCircle2, color: 'bg-green-500' },
  { id: 'enviado-producao', label: 'Enviado p/ Produção', icon: Package, color: 'bg-indigo-500' },
  { id: 'sublimacao', label: 'Sublimação', icon: Printer, color: 'bg-orange-500' },
  { id: 'finalizado', label: 'Finalizado', icon: Scissors, color: 'bg-teal-500' },
  { id: 'entregue', label: 'Entregue', icon: Truck, color: 'bg-gray-500' },
]

export default function ProducaoPage() {
  const { orders, designers, moveOrder } = useAppStore()
  const [search, setSearch] = useState('')

  const productionOrders = orders.filter(o => 
    ['aprovado', 'enviado-producao', 'sublimacao', 'finalizado', 'entregue'].includes(o.status)
  )

  const filteredOrders = productionOrders.filter(o =>
    o.clientName.toLowerCase().includes(search.toLowerCase()) ||
    o.teamName.toLowerCase().includes(search.toLowerCase())
  )

  const getDesignerName = (id: string | null) => {
    if (!id) return 'Não atribuído'
    return designers.find(d => d.id === id)?.name || 'Desconhecido'
  }

  const getStageIndex = (status: string) => {
    return productionStages.findIndex(s => s.id === status)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Produção</h1>
          </div>
          <p className="text-muted-foreground">
            Acompanhe os pedidos em produção
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedidos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {productionStages.map((stage) => {
          const count = productionOrders.filter(o => o.status === stage.id).length
          return (
            <Card key={stage.id} className="glass border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stage.color.replace('bg-', 'bg-').concat('/20'))}>
                  <stage.icon className={cn("h-5 w-5", stage.color.replace('bg-', 'text-'))} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="glass border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum pedido em produção</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const stageIndex = getStageIndex(order.status)
            
            return (
              <Card key={order.id} className="glass border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{order.clientName}</h3>
                          <p className="text-sm text-muted-foreground">{order.teamName}</p>
                        </div>
                        <Badge variant="outline">{getServiceLabel(order.serviceType)}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {order.totalQuantity} unidades
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(order.deadline), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span>Designer: {getDesignerName(order.designerId)}</span>
                      </div>
                    </div>

                    {/* Progress Stages */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {productionStages.map((stage, index) => {
                          const isCompleted = index <= stageIndex
                          const isCurrent = index === stageIndex
                          
                          return (
                            <button
                              key={stage.id}
                              onClick={() => moveOrder(order.id, stage.id as any)}
                              className={cn(
                                "relative flex flex-col items-center group",
                                "transition-all duration-200"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                isCompleted ? stage.color : "bg-muted",
                                isCurrent && "ring-4 ring-offset-2 ring-offset-background",
                                isCurrent && stage.color.replace('bg-', 'ring-').concat('/50')
                              )}>
                                <stage.icon className={cn(
                                  "h-5 w-5",
                                  isCompleted ? "text-white" : "text-muted-foreground"
                                )} />
                              </div>
                              <span className={cn(
                                "text-xs mt-1 whitespace-nowrap",
                                isCurrent ? "font-medium" : "text-muted-foreground"
                              )}>
                                {stage.label.split(' ')[0]}
                              </span>
                              
                              {/* Connector */}
                              {index < productionStages.length - 1 && (
                                <div className={cn(
                                  "absolute top-5 left-full w-2 h-0.5",
                                  index < stageIndex ? stage.color : "bg-muted"
                                )} />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
