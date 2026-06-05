'use client'

import { useAppStore, getStatusLabel } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import {
  Package,
  Palette,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Truck
} from 'lucide-react'
import { isAfter, parseISO, startOfToday } from 'date-fns'

export function DashboardStats() {
  const { orders, designers } = useAppStore()
  const today = startOfToday()

  const stats = {
    totalToday: orders.filter(o => {
      const created = parseISO(o.createdAt)
      return created >= today
    }).length,
    inCreation: orders.filter(o => o.status === 'em-criacao').length,
    overdue: orders.filter(o => {
      const deadline = parseISO(o.deadline)
      return isAfter(today, deadline) && !['finalizado', 'entregue'].includes(o.status)
    }).length,
    awaitingApproval: orders.filter(o => o.status === 'enviado-aprovacao').length,
    approved: orders.filter(o => o.status === 'aprovado').length,
    finished: orders.filter(o => o.status === 'finalizado').length,
    totalMonth: orders.length,
    inProduction: orders.filter(o => ['sublimacao', 'enviado-producao'].includes(o.status)).length
  }

  const statCards = [
    {
      title: 'Pedidos Hoje',
      value: stats.totalToday,
      icon: Package,
      color: 'bg-blue-500/10 text-blue-500',
      iconBg: 'bg-blue-500/20'
    },
    {
      title: 'Em Criação',
      value: stats.inCreation,
      icon: Palette,
      color: 'bg-purple-500/10 text-purple-500',
      iconBg: 'bg-purple-500/20'
    },
    {
      title: 'Atrasados',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'bg-red-500/10 text-red-500',
      iconBg: 'bg-red-500/20'
    },
    {
      title: 'Aguardando Aprovação',
      value: stats.awaitingApproval,
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-500',
      iconBg: 'bg-amber-500/20'
    },
    {
      title: 'Aprovados',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'bg-green-500/10 text-green-500',
      iconBg: 'bg-green-500/20'
    },
    {
      title: 'Finalizados',
      value: stats.finished,
      icon: TrendingUp,
      color: 'bg-primary/10 text-primary',
      iconBg: 'bg-primary/20'
    },
    {
      title: 'Em Produção',
      value: stats.inProduction,
      icon: Truck,
      color: 'bg-cyan-500/10 text-cyan-500',
      iconBg: 'bg-cyan-500/20'
    },
    {
      title: 'Total do Mês',
      value: stats.totalMonth,
      icon: Package,
      color: 'bg-slate-500/10 text-slate-500',
      iconBg: 'bg-slate-500/20'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={index} 
          className="glass border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color.split(' ')[1]}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DesignerRanking() {
  const { orders, designers } = useAppStore()

  const ranking = designers.map(designer => {
    const designerOrders = orders.filter(o => o.designerId === designer.id)
    const completed = designerOrders.filter(o => ['finalizado', 'entregue'].includes(o.status)).length
    const inProgress = designerOrders.filter(o => !['finalizado', 'entregue', 'novo-pedido'].includes(o.status)).length
    
    return {
      ...designer,
      total: designerOrders.length,
      completed,
      inProgress
    }
  }).sort((a, b) => b.completed - a.completed)

  return (
    <Card className="glass border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Ranking de Designers</h3>
        </div>
        <div className="space-y-4">
          {ranking.map((designer, index) => (
            <div key={designer.id} className="flex items-center gap-4">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${index === 0 ? 'bg-primary text-primary-foreground' : 
                  index === 1 ? 'bg-slate-300 text-slate-700' : 
                  index === 2 ? 'bg-amber-200 text-amber-700' : 
                  'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium">{designer.name}</p>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                  <span>{designer.completed} finalizados</span>
                  <span>{designer.inProgress} em andamento</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">{designer.total}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentOrders() {
  const { orders, designers } = useAppStore()
  
  const recentOrders = orders
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const getDesignerName = (id: string | null) => {
    if (!id) return 'Não atribuído'
    return designers.find(d => d.id === id)?.name || 'Desconhecido'
  }

  return (
    <Card className="glass border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Atividade Recente</h3>
        </div>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className={`
                w-2 h-2 rounded-full
                ${order.priority === 'urgente' ? 'bg-red-500' :
                  order.priority === 'alta' ? 'bg-amber-500' :
                  order.priority === 'normal' ? 'bg-green-500' : 'bg-blue-500'}
              `} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {getDesignerName(order.designerId)} • {getStatusLabel(order.status)}
                </p>
              </div>
              <span className={`
                text-xs px-2 py-1 rounded-full
                priority-${order.priority}
              `}>
                {order.priority}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
