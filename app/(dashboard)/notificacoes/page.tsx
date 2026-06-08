'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ThumbsUp,
  Edit3,
  User,
  CheckCheck
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const notificationIcons = {
  'nova-tarefa': FileText,
  'tarefa-atribuida': User,
  'cliente-aprovou': ThumbsUp,
  'ajuste-solicitado': Edit3,
  'prazo-proximo': Clock,
  'pedido-atrasado': AlertCircle,
  'arquivo-enviado': FileText
}

const notificationColors = {
  'nova-tarefa': 'bg-blue-500/10 text-blue-500',
  'tarefa-atribuida': 'bg-purple-500/10 text-purple-500',
  'cliente-aprovou': 'bg-green-500/10 text-green-500',
  'ajuste-solicitado': 'bg-red-500/10 text-red-500',
  'prazo-proximo': 'bg-amber-500/10 text-amber-500',
  'pedido-atrasado': 'bg-red-500/10 text-red-500',
  'arquivo-enviado': 'bg-cyan-500/10 text-cyan-500'
}

export default function NotificacoesPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Notificações</h1>
            {unreadCount > 0 && (
              <Badge className="bg-primary">{unreadCount} novas</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Acompanhe as atualizações do sistema
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllNotificationsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="glass border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = notificationIcons[notification.type]
            const colorClass = notificationColors[notification.type]
            
            return (
              <Card 
                key={notification.id} 
                className={cn(
                  "glass border-0 shadow-md transition-all cursor-pointer hover:shadow-lg",
                  !notification.read && "ring-2 ring-primary/20"
                )}
                onClick={() => markNotificationRead(notification.id)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn("font-medium", !notification.read && "font-bold")}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
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
