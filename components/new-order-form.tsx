'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, Priority, ServiceType, ModelType, SizeGrid } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Phone,
  Calendar,
  AlertTriangle,
  Package,
  Palette,
  Ruler,
  MessageSquare,
  Upload,
  Save,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

const serviceTypes: { value: ServiceType; label: string }[] = [
  { value: 'camisa-time', label: 'Camisa de Time' },
  { value: 'camisa-promocional', label: 'Camisa Promocional' },
  { value: 'abada', label: 'Abadá' },
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'colete', label: 'Colete' },
  { value: 'bandeira', label: 'Bandeira' },
  { value: 'banner', label: 'Banner' },
  { value: 'arte-avulsa', label: 'Arte Avulsa' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'outro', label: 'Outro' },
]

const modelTypes: { value: ModelType; label: string }[] = [
  { value: 'manga-curta', label: 'Manga Curta' },
  { value: 'manga-longa', label: 'Manga Longa' },
  { value: 'gola-careca', label: 'Gola Careca' },
  { value: 'gola-alta', label: 'Gola Alta' },
  { value: 'gola-polo', label: 'Gola Polo' },
  { value: 'regata', label: 'Regata' },
  { value: 'short', label: 'Short' },
  { value: 'conjunto', label: 'Conjunto' },
]

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: 'bg-blue-500' },
  { value: 'normal', label: 'Normal', color: 'bg-green-500' },
  { value: 'alta', label: 'Alta', color: 'bg-amber-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500' },
]

export function NewOrderForm() {
  const router = useRouter()
  const { addOrder, designers } = useAppStore()
  
  const [formData, setFormData] = useState({
    clientName: '',
    teamName: '',
    phone: '',
    deadline: '',
    priority: 'normal' as Priority,
    serviceType: 'camisa-time' as ServiceType,
    model: 'manga-curta' as ModelType,
    totalQuantity: 0,
    colors: '',
    observations: '',
    designerId: null as string | null,
    sizeGrid: {
      PP: 0,
      P: 0,
      M: 0,
      G: 0,
      GG: 0,
      XG: 0,
      XGG: 0,
      infantil: 0,
      outros: ''
    } as SizeGrid
  })

  const handleSizeChange = (size: keyof SizeGrid, value: string) => {
    if (size === 'outros') {
      setFormData(prev => ({
        ...prev,
        sizeGrid: { ...prev.sizeGrid, outros: value }
      }))
    } else {
      const numValue = parseInt(value) || 0
      setFormData(prev => ({
        ...prev,
        sizeGrid: { ...prev.sizeGrid, [size]: numValue }
      }))
    }
  }

  const calculateTotal = () => {
    const sizes = formData.sizeGrid
    return sizes.PP + sizes.P + sizes.M + sizes.G + sizes.GG + sizes.XG + sizes.XGG + sizes.infantil
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const total = calculateTotal()
    
    addOrder({
      ...formData,
      totalQuantity: total || formData.totalQuantity,
      status: 'novo-pedido',
      files: []
    })
    
    router.push('/kanban')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/kanban">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo Pedido</h1>
            <p className="text-muted-foreground">Preencha as informações do pedido</p>
          </div>
        </div>
        <Button type="submit" size="lg" className="gap-2">
          <Save className="h-5 w-5" />
          Salvar Pedido
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Client Info */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                placeholder="Ex: Futebol Clube Estrela"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome da Equipe / Projeto *</Label>
              <Input
                id="teamName"
                placeholder="Ex: Time Principal 2026"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo de Entrega *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-10"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value as ServiceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo da Peça</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => setFormData({ ...formData, model: value as ModelType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelTypes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Designer Responsável</Label>
              <Select
                value={formData.designerId || ''}
                onValueChange={(value) => setFormData({ ...formData, designerId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar designer" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Size Grid */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              Grade de Tamanhos
              <span className="ml-auto text-lg font-bold text-primary">
                Total: {calculateTotal()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {(['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'infantil'] as const).map((size) => (
                <div key={size} className="space-y-2">
                  <Label className="text-center block uppercase text-xs">
                    {size === 'infantil' ? 'Infantil' : size}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="text-center"
                    value={formData.sizeGrid[size] || ''}
                    onChange={(e) => handleSizeChange(size, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Label>Outros tamanhos personalizados</Label>
              <Input
                placeholder="Ex: 2XGG, 3XGG, etc."
                value={formData.sizeGrid.outros}
                onChange={(e) => handleSizeChange('outros', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors and Observations */}
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Cores e Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colors">Cores Principais da Arte</Label>
              <Input
                id="colors"
                placeholder="Ex: Azul marinho, branco e dourado"
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações do Cliente</Label>
              <Textarea
                id="observations"
                placeholder="Descreva detalhes importantes sobre o pedido..."
                className="min-h-[120px] resize-none"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files Upload */}
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Arquivos do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold text-lg mb-1">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground">
              Formatos aceitos: EPS, PSD, AI, CDR, PDF, PNG, JPG, SVG, WEBP, ZIP, RAR
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button Mobile */}
      <div className="lg:hidden">
        <Button type="submit" size="lg" className="w-full gap-2">
          <Save className="h-5 w-5" />
          Salvar Pedido
        </Button>
      </div>
    </form>
  )
}
