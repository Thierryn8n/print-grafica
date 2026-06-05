'use client'

import { useAppStore, getStatusLabel, getServiceLabel, getPriorityLabel } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react'

export default function DesignersPage() {
  const { designers, orders } = useAppStore()

  const getDesignerStats = (designerId: string) => {
    const designerOrders = orders.filter(o => o.designerId === designerId)
    const completed = designerOrders.filter(o => ['finalizado', 'entregue'].includes(o.status)).length
    const inProgress = designerOrders.filter(o => !['finalizado', 'entregue', 'novo-pedido'].includes(o.status)).length
    const pending = designerOrders.filter(o => o.status === 'novo-pedido').length
    
    return { total: designerOrders.length, completed, inProgress, pending }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Designers</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie sua equipe de designers
        </p>
      </div>

      {/* Designers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {designers.map((designer) => {
          const stats = getDesignerStats(designer.id)
          
          return (
            <Card key={designer.id} className="glass border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {designer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-lg">{designer.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {designer.email}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <Briefcase className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Finalizados</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-xl p-3">
                    <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button variant="outline" className="w-full">
                    Ver Tarefas
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Designer Card */}
      <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-muted-foreground">Adicionar Novo Designer</p>
        </CardContent>
      </Card>
    </div>
  )
}
