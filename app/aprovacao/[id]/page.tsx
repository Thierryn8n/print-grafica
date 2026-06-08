'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useAppStore, getServiceLabel, getModelLabel } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  AlertCircle,
  Package,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function AprovacaoPage() {
  const params = useParams()
  const orderId = params.id as string
  const { orders, updateOrder, moveOrder, addNotification } = useAppStore()
  
  const [order, setOrder] = useState(orders.find(o => o.id === orderId))
  const [clientName, setClientName] = useState('')
  const [observations, setObservations] = useState('')
  const [approved, setApproved] = useState(false)
  const [requestedChanges, setRequestedChanges] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mockupView, setMockupView] = useState<'front' | 'back'>('front')

  useEffect(() => {
    const foundOrder = orders.find(o => o.id === orderId)
    setOrder(foundOrder)
  }, [orders, orderId])

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Pedido não encontrado</h1>
            <p className="text-muted-foreground">
              O link de aprovação pode ter expirado ou o pedido foi removido.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleApprove = async () => {
    if (!clientName.trim()) {
      alert('Por favor, informe seu nome para confirmar a aprovação.')
      return
    }

    setIsSubmitting(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    updateOrder(order.id, {
      approvedAt: new Date().toISOString(),
      approvedBy: clientName,
      clientObservations: observations
    })
    
    moveOrder(order.id, 'aprovado')
    
    addNotification({
      type: 'cliente-aprovou',
      title: 'Arte aprovada!',
      message: `${order.clientName} aprovou o mockup.`,
      orderId: order.id
    })

    setApproved(true)
    setIsSubmitting(false)
  }

  const handleRequestChanges = async () => {
    if (!clientName.trim()) {
      alert('Por favor, informe seu nome.')
      return
    }
    if (!observations.trim()) {
      alert('Por favor, descreva as alterações desejadas.')
      return
    }

    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))

    updateOrder(order.id, {
      clientObservations: observations
    })
    
    moveOrder(order.id, 'ajustes-solicitados')
    
    addNotification({
      type: 'ajuste-solicitado',
      title: 'Ajuste solicitado',
      message: `${order.clientName} solicitou alterações no mockup.`,
      orderId: order.id
    })

    setRequestedChanges(true)
    setIsSubmitting(false)
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center glass border-0 shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-600">Arte Aprovada!</h1>
            <p className="text-muted-foreground mb-6">
              Obrigado por aprovar a arte. Seu pedido seguirá para produção em breve.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 text-left">
              <p className="text-sm"><strong>Cliente:</strong> {order.clientName}</p>
              <p className="text-sm"><strong>Projeto:</strong> {order.teamName}</p>
              <p className="text-sm"><strong>Aprovado por:</strong> {clientName}</p>
              <p className="text-sm"><strong>Data:</strong> {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requestedChanges) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center glass border-0 shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
              <Edit3 className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-amber-600">Ajustes Solicitados</h1>
            <p className="text-muted-foreground mb-6">
              Recebemos sua solicitação de ajustes. Nossa equipe irá revisar e entrar em contato.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 text-left">
              <p className="text-sm"><strong>Solicitado por:</strong> {clientName}</p>
              <p className="text-sm"><strong>Observações:</strong></p>
              <p className="text-sm text-muted-foreground">{observations}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-sidebar text-sidebar-foreground py-4 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1">
            <Image 
              src="/images/logo.png" 
              alt="GN Sublimais" 
              width={32} 
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg">PrintFlow Studio</h1>
            <p className="text-xs text-sidebar-foreground/60">Aprovação de Arte</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Mockup Preview */}
          <div className="space-y-4">
            <Card className="glass border-0 shadow-xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Prévia do Mockup</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant={mockupView === 'front' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setMockupView('front')}
                    >
                      Frente
                    </Button>
                    <Button 
                      variant={mockupView === 'back' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setMockupView('back')}
                    >
                      Costas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
                  {/* Placeholder for mockup image */}
                  <div className="text-center p-8">
                    <Package className="h-24 w-24 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      Mockup {mockupView === 'front' ? 'Frente' : 'Costas'}
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Imagem do mockup será exibida aqui
                    </p>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setMockupView('front')}
                    disabled={mockupView === 'front'}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setMockupView('back')}
                    disabled={mockupView === 'back'}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details & Approval */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card className="glass border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Detalhes do Pedido
                  </CardTitle>
                  <Badge variant="outline">{getServiceLabel(order.serviceType)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{order.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Projeto</p>
                    <p className="font-medium">{order.teamName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{order.totalQuantity} unidades</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-medium">{getModelLabel(order.model)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Cores</p>
                  <p className="font-medium">{order.colors}</p>
                </div>

                {order.observations && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Observações</p>
                    <p className="text-sm">{order.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Form */}
            <Card className="glass border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Seu Nome *</Label>
                  <Input
                    id="clientName"
                    placeholder="Digite seu nome completo"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações (opcional)</Label>
                  <Textarea
                    id="observations"
                    placeholder="Deixe suas observações ou descreva os ajustes necessários..."
                    className="min-h-[100px] resize-none"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600 text-sm">Atenção!</p>
                      <p className="text-sm text-muted-foreground">
                        Ao aprovar esta arte, você confirma que está de acordo com o layout, cores, nomes, números, logos e todas as informações para seguir para produção.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid sm:grid-cols-2 gap-3 pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRequestChanges}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit3 className="h-4 w-4" />
                    )}
                    Solicitar Ajuste
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4" />
                    )}
                    Aprovar Arte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 GN Sublimais - PrintFlow Studio</p>
          <p className="mt-1">Sistema de Gerenciamento de Produção</p>
        </div>
      </footer>
    </div>
  )
}
