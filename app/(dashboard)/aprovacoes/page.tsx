'use client'

import { useAppStore, getStatusLabel } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  AlertCircle,
  ThumbsUp,
  Edit3
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function AprovacoesPage() {
  const { orders, designers } = useAppStore()

  const awaitingApproval = orders.filter(o => o.status === 'enviado-aprovacao')
  const approved = orders.filter(o => o.status === 'aprovado')
  const changesRequested = orders.filter(o => o.status === 'ajustes-solicitados')

  const getDesignerName = (id: string | null) => {
    if (!id) return 'Não atribuído'
    return designers.find(d => d.id === id)?.name || 'Desconhecido'
  }

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    alert('Link copiado!')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Aprovações</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie as aprovações de mockups pelos clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass border-0 shadow-md bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{awaitingApproval.length}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0 shadow-md bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <ThumbsUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approved.length}</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-0 shadow-md bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Edit3 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{changesRequested.length}</p>
              <p className="text-xs text-muted-foreground">Com Ajustes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Approval */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Aguardando Aprovação ({awaitingApproval.length})
        </h2>
        {awaitingApproval.length === 0 ? (
          <Card className="glass border-0 shadow-md">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum pedido aguardando aprovação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {awaitingApproval.map((order) => (
              <Card key={order.id} className="glass border-0 shadow-lg border-l-4 border-l-amber-500">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{order.clientName}</h3>
                      <p className="text-sm text-muted-foreground">{order.teamName}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Aguardando
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Designer: {getDesignerName(order.designerId)}
                  </p>
                  {order.approvalLink ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => copyLink(order.approvalLink!)}
                      >
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => window.open(order.approvalLink, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Link de aprovação não gerado
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Changes Requested */}
      {changesRequested.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Ajustes Solicitados ({changesRequested.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {changesRequested.map((order) => (
              <Card key={order.id} className="glass border-0 shadow-lg border-l-4 border-l-red-500">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{order.clientName}</h3>
                      <p className="text-sm text-muted-foreground">{order.teamName}</p>
                    </div>
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                      Ajustes
                    </Badge>
                  </div>
                  {order.clientObservations && (
                    <div className="bg-red-500/5 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-red-600 mb-1">Observações do cliente:</p>
                      <p className="text-sm">{order.clientObservations}</p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Designer: {getDesignerName(order.designerId)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ThumbsUp className="h-5 w-5 text-green-500" />
          Aprovados Recentemente ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <Card className="glass border-0 shadow-md">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum pedido aprovado recentemente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approved.map((order) => (
              <Card key={order.id} className="glass border-0 shadow-lg border-l-4 border-l-green-500">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold">{order.clientName}</h3>
                      <p className="text-sm text-muted-foreground">{order.teamName}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      Aprovado
                    </Badge>
                  </div>
                  {order.approvedAt && (
                    <p className="text-xs text-muted-foreground">
                      Aprovado em {format(parseISO(order.approvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  {order.approvedBy && (
                    <p className="text-xs text-muted-foreground">
                      Por: {order.approvedBy}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
