'use client'

import { useState } from 'react'
import { Order, useAppStore, getStatusLabel, getServiceLabel, getPriorityLabel, getModelLabel, getStageLabel, OrderStatus, ProductionStage } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Phone,
  Calendar,
  Package,
  Palette,
  FileText,
  MessageSquare,
  History,
  CheckSquare,
  Upload,
  Link2,
  Copy,
  Send,
  Trash2,
  Edit3,
  Scissors,
  ArrowRightCircle,
  Receipt,
  X
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { generateReceiptPdf } from '@/lib/receipt'
import { getMyCompany } from '@/lib/company'
import { createClient } from '@/lib/supabase/client'

interface OrderModalProps {
  order: Order
  open: boolean
  onClose: () => void
}

export function OrderModal({ order, open, onClose }: OrderModalProps) {
  const { designers, updateOrder, addComment, updateChecklist, deleteOrder, moveOrder, passOrderTo, currentUser } = useAppStore()
  const [newComment, setNewComment] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedOrder, setEditedOrder] = useState(order)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)

  const designer = designers.find(d => d.id === order.designerId)

  // Valores financeiros do pedido
  const totalValue = order.totalPrice ?? 0
  const downPaymentPercent = order.downPaymentPercent ?? 50
  const downPayment = totalValue * (downPaymentPercent / 100)
  const remaining = totalValue - downPayment

  const handleGenerateReceipt = async () => {
    setGeneratingReceipt(true)
    try {
      const company = await getMyCompany()
      const supabase = createClient()
      const { data: paymentRow } = await supabase
        .from('orders')
        .select('total_value, paid_value, payment_status, down_payment_percent')
        .eq('id', order.id)
        .maybeSingle()

      const total = paymentRow?.total_value ?? totalValue
      const pct = paymentRow?.down_payment_percent ?? downPaymentPercent
      const paid = paymentRow?.paid_value ?? 0
      await generateReceiptPdf({
        company,
        order: {
          id: order.id,
          clientName: order.clientName,
          teamName: order.teamName,
          phone: order.phone,
          quantity: order.totalQuantity,
          serviceLabel: getServiceLabel(order.serviceType),
          modelLabel: getModelLabel(order.model),
        },
        total,
        downPaymentPercent: pct,
        paid,
      })
    } catch (err: any) {
      console.log('[v0] erro ao gerar recibo:', err?.message)
      alert('Não foi possível gerar o recibo.')
    }
    setGeneratingReceipt(false)
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(order.id, newComment.trim())
      setNewComment('')
    }
  }

  const handleChecklistChange = (key: keyof typeof order.checklist) => {
    updateChecklist(order.id, { [key]: !order.checklist[key] })
  }

  const handleSaveEdit = () => {
    updateOrder(order.id, editedOrder)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
      deleteOrder(order.id)
      onClose()
    }
  }

  const generateApprovalLink = () => {
    const link = `${window.location.origin}/aprovacao/${order.id}`
    updateOrder(order.id, { approvalLink: link })
    navigator.clipboard.writeText(link)
    alert('Link copiado para a área de transferência!')
  }

  const priorityColors = {
    baixa: 'priority-low',
    normal: 'priority-normal',
    alta: 'priority-high',
    urgente: 'priority-urgent'
  }

  const checklistItems = [
    { key: 'logoConferida', label: 'Logo do cliente conferida' },
    { key: 'nomeConferido', label: 'Nome conferido' },
    { key: 'numeroConferido', label: 'Número conferido' },
    { key: 'coresConferidas', label: 'Cores conferidas' },
    { key: 'tamanhosConferidos', label: 'Tamanhos conferidos' },
    { key: 'mockupFrenteConferido', label: 'Mockup frente conferido' },
    { key: 'mockupCostasConferido', label: 'Mockup costas conferido' },
    { key: 'arquivoAltaQualidade', label: 'Arquivo em alta qualidade' },
    { key: 'arquivoProntoImpressao', label: 'Arquivo pronto para impressão' },
    { key: 'clienteAprovou', label: 'Cliente aprovou' },
  ] as const

  const statuses: OrderStatus[] = [
    'novo-pedido', 'aguardando-info', 'em-criacao', 'revisao-interna',
    'mockup-pronto', 'enviado-aprovacao', 'aprovado', 'ajustes-solicitados',
    'arte-finalizada', 'enviado-producao', 'sublimacao', 'finalizado', 'entregue'
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{order.clientName}</DialogTitle>
              <p className="text-muted-foreground">{order.teamName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn(priorityColors[order.priority])}>
                {getPriorityLabel(order.priority)}
              </Badge>
              <Badge variant="outline">{getStatusLabel(order.status)}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="flex-1">
          <div className="px-6">
            <TabsList className="w-full justify-start bg-muted/50 p-1">
              <TabsTrigger value="detalhes" className="gap-2">
                <FileText className="h-4 w-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="checklist" className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Checklist
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentários
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="arquivos" className="gap-2">
                <Upload className="h-4 w-4" />
                Arquivos
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[500px]">
            <TabsContent value="detalhes" className="p-6 pt-4 m-0">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Info Column */}
                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Informações do Cliente
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                      <p className="text-sm"><strong>Cliente:</strong> {order.clientName}</p>
                      <p className="text-sm"><strong>Projeto:</strong> {order.teamName}</p>
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {order.phone}
                      </p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Detalhes do Pedido
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                      <p className="text-sm"><strong>Serviço:</strong> {getServiceLabel(order.serviceType)}</p>
                      <p className="text-sm"><strong>Modelo:</strong> {getModelLabel(order.model)}</p>
                      <p className="text-sm"><strong>Quantidade:</strong> {order.totalQuantity} unidades</p>
                      <p className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <strong>Prazo:</strong> {format(parseISO(order.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {/* Pagamento */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      Pagamento
                    </h4>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Valor total</span>
                        <span className="text-2xl font-bold text-primary">
                          {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Entrada ({downPaymentPercent}%)</span>
                        <span className="font-semibold text-success">
                          {downPayment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Saldo restante</span>
                        <span className="font-medium">
                          {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <Button
                        onClick={handleGenerateReceipt}
                        disabled={generatingReceipt}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Receipt className="h-4 w-4" />
                        {generatingReceipt ? 'Gerando...' : 'Gerar Recibo (PDF)'}
                      </Button>
                    </div>
                  </div>

                  {/* Size Grid */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Grade de Tamanhos</h4>
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        {Object.entries(order.sizeGrid).filter(([key, value]) => key !== 'outros' && value > 0).map(([size, qty]) => (
                          <div key={size} className="bg-background rounded-lg p-2">
                            <span className="font-bold text-primary">{size.toUpperCase()}</span>
                            <p className="text-muted-foreground">{qty}</p>
                          </div>
                        ))}
                      </div>
                      {order.sizeGrid.outros && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Outros: {order.sizeGrid.outros}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Column */}
                <div className="space-y-6">
                  {/* Designer */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Designer Responsável
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4">
                      {designer ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {designer.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{designer.name}</p>
                            <p className="text-sm text-muted-foreground">{designer.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nenhum designer atribuído</p>
                      )}
                      <Select 
                        value={order.designerId || ''} 
                        onValueChange={(value) => updateOrder(order.id, { designerId: value || null })}
                      >
                        <SelectTrigger className="mt-3">
                          <SelectValue placeholder="Atribuir designer" />
                        </SelectTrigger>
                        <SelectContent>
                          {designers.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Colors & Observations */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Cores e Observações</h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Cores principais:</p>
                        <p className="font-medium">{order.colors}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Observações:</p>
                        <p className="text-sm">{order.observations || 'Nenhuma observação'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Change */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Alterar Status</h4>
                    <Select 
                      value={order.status} 
                      onValueChange={(value) => moveOrder(order.id, value as OrderStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {getStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Production Stage / Repasse */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ArrowRightCircle className="h-4 w-4 text-primary" />
                      Etapa de Produção
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Etapa atual:</span>
                        <Badge variant="secondary">{getStageLabel(order.productionStage)}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.productionStage === 'design1' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => passOrderTo(order.id, 'design2')}
                          >
                            <ArrowRightCircle className="h-4 w-4" />
                            Repassar p/ Designer 2
                          </Button>
                        )}
                        {order.productionStage !== 'costura' && order.productionStage !== 'concluido' && (
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => passOrderTo(order.id, 'costura')}
                          >
                            <Scissors className="h-4 w-4" />
                            Enviar para Costura
                          </Button>
                        )}
                        {order.productionStage === 'costura' && currentUser?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => passOrderTo(order.id, 'concluido')}
                          >
                            <CheckSquare className="h-4 w-4" />
                            Marcar como Concluído
                          </Button>
                        )}
                      </div>
                      {order.sentToCosturaAt && (
                        <p className="text-xs text-muted-foreground">
                          Enviado para costura em{' '}
                          {format(parseISO(order.sentToCosturaAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={generateApprovalLink} className="gap-2">
                      <Link2 className="h-4 w-4" />
                      Gerar Link de Aprovação
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>

                  {order.approvalLink && (
                    <div className="bg-green-500/10 rounded-xl p-4">
                      <p className="text-sm text-green-600 font-medium mb-2">Link de aprovação gerado:</p>
                      <div className="flex items-center gap-2">
                        <Input value={order.approvalLink} readOnly className="text-sm" />
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(order.approvalLink!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="p-6 pt-4 m-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Checklist de Conferência</h4>
                  <span className="text-sm text-muted-foreground">
                    {Object.values(order.checklist).filter(Boolean).length} de {Object.values(order.checklist).length} completos
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {checklistItems.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-colors cursor-pointer",
                        order.checklist[item.key] 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-muted/30 border-border hover:bg-muted/50"
                      )}
                      onClick={() => handleChecklistChange(item.key)}
                    >
                      <Checkbox 
                        checked={order.checklist[item.key]} 
                        className="pointer-events-none"
                      />
                      <Label className="cursor-pointer flex-1">{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comentarios" className="p-6 pt-4 m-0">
              <div className="space-y-4">
                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="resize-none"
                  />
                  <Button onClick={handleAddComment} size="icon" className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {order.comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum comentário ainda
                    </p>
                  ) : (
                    order.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {comment.userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{comment.userName}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.userRole === 'admin' ? 'Administrador' : 'Designer'}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(parseISO(comment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="p-6 pt-4 m-0">
              <div className="space-y-4">
                {order.history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro no histórico
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    {order.history.map((entry, index) => (
                      <div key={entry.id} className="relative flex gap-4 pb-6">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center z-10",
                          index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <History className="h-4 w-4" />
                        </div>
                        <div className="flex-1 bg-muted/50 rounded-xl p-4">
                          <p className="font-medium text-sm">{entry.action}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{entry.userName}</span>
                            <span>•</span>
                            <span>{format(parseISO(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="arquivos" className="p-6 pt-4 m-0">
              <div className="space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Arraste arquivos aqui ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    EPS, PSD, AI, CDR, PDF, PNG, JPG, SVG, WEBP, ZIP, RAR
                  </p>
                </div>

                {/* Files List */}
                {order.files.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum arquivo anexado
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {order.files.map((file) => (
                      <div key={file.id} className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(file.uploadedAt), "dd/MM/yyyy", { locale: ptBR })}
                            {file.version && ` • Versão ${file.version}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
