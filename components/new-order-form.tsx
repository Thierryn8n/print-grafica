'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, Priority, ServiceType, ModelType, SizeGrid, Player } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  ArrowLeft,
  Hash,
  Plus,
  Trash2,
  Shirt,
  DollarSign,
  Layers
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

interface FabricOption {
  id: string
  name: string
  base_price_complete: number
  base_price_shirt_only: number
}

interface ProductTypeOption {
  id: string
  name: string
  additional_price: number
}

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function NewOrderForm() {
  const router = useRouter()
  const { addOrder, designers } = useAppStore()
  const supabase = createClient()

  const [fabrics, setFabrics] = useState<FabricOption[]>([])
  const [shirtTypes, setShirtTypes] = useState<ProductTypeOption[]>([])
  const [shortTypes, setShortTypes] = useState<ProductTypeOption[]>([])
  const [downPaymentPercent, setDownPaymentPercent] = useState(50)
  const [pricing, setPricing] = useState({
    fabricId: '',
    shirtTypeId: '',
    shortTypeId: '',
    priceMode: 'complete' as 'complete' | 'shirt_only',
  })

  useEffect(() => {
    async function loadCatalog() {
      const [fabricRes, shirtRes, shortRes, settingsRes] = await Promise.all([
        supabase.from('fabrics').select('id, name, base_price_complete, base_price_shirt_only').eq('is_active', true).order('sort_order'),
        supabase.from('shirt_types').select('id, name, additional_price').eq('is_active', true).order('sort_order'),
        supabase.from('short_types').select('id, name, additional_price').eq('is_active', true).order('sort_order'),
        supabase.from('company_settings').select('down_payment_percent').maybeSingle(),
      ])
      if (fabricRes.data) setFabrics(fabricRes.data as FabricOption[])
      if (shirtRes.data) setShirtTypes(shirtRes.data as ProductTypeOption[])
      if (shortRes.data) setShortTypes(shortRes.data as ProductTypeOption[])
      if (settingsRes.data?.down_payment_percent != null) {
        setDownPaymentPercent(Number(settingsRes.data.down_payment_percent))
      }
    }
    loadCatalog()
  }, [])

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
    hasNumbering: false,
    players: [] as Player[],
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

  // ----- Cálculo de preço: tecido (base) + modelos (adicionais) -----
  const selectedFabric = fabrics.find(f => f.id === pricing.fabricId)
  const selectedShirt = shirtTypes.find(s => s.id === pricing.shirtTypeId)
  const selectedShort = shortTypes.find(s => s.id === pricing.shortTypeId)

  const basePrice = selectedFabric
    ? (pricing.priceMode === 'shirt_only'
        ? selectedFabric.base_price_shirt_only
        : selectedFabric.base_price_complete)
    : 0
  const shirtAdditional = selectedShirt?.additional_price || 0
  const shortAdditional = selectedShort?.additional_price || 0
  const modelPrice = shirtAdditional + shortAdditional
  const unitPrice = basePrice + modelPrice
  const quantity = calculateTotal()
  const totalPrice = unitPrice * quantity
  const downPayment = totalPrice * (downPaymentPercent / 100)
  const remaining = totalPrice - downPayment

  const isTeamShirt = formData.serviceType === 'camisa-time'
  const showNumbering = isTeamShirt && formData.hasNumbering

  const addPlayer = () => {
    setFormData(prev => ({
      ...prev,
      players: [
        ...prev.players,
        { id: `p${Date.now()}-${prev.players.length}`, number: '', name: '', size: '' },
      ],
    }))
  }

  const updatePlayer = (id: string, field: keyof Player, value: string) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.map(p => (p.id === id ? { ...p, [field]: value } : p)),
    }))
  }

  const removePlayer = (id: string) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== id),
    }))
  }

  const toggleNumbering = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      hasNumbering: checked,
      players: checked && prev.players.length === 0
        ? [{ id: `p${Date.now()}`, number: '', name: '', size: '' }]
        : prev.players,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const total = calculateTotal()

    const cleanedPlayers = showNumbering
      ? formData.players.filter(p => p.number.trim() || p.name.trim())
      : []

    addOrder({
      ...formData,
      hasNumbering: showNumbering,
      players: cleanedPlayers,
      totalQuantity: total || formData.totalQuantity,
      fabricId: pricing.fabricId || null,
      fabricName: selectedFabric?.name,
      basePrice,
      modelPrice,
      unitPrice,
      totalPrice: unitPrice * (total || formData.totalQuantity),
      downPaymentPercent,
      downPayment: unitPrice * (total || formData.totalQuantity) * (downPaymentPercent / 100),
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

      {/* Valor em destaque (sempre visível) */}
      <div className="sticky top-2 z-20 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Valor do pedido</p>
            <p className="text-3xl md:text-4xl font-bold text-primary leading-tight">
              {currency(totalPrice)}
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Entrada ({downPaymentPercent}%)</p>
              <p className="text-xl md:text-2xl font-bold text-success">{currency(downPayment)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className="text-xl md:text-2xl font-semibold text-foreground">{currency(remaining)}</p>
            </div>
          </div>
        </div>
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

      {/* Tecido e Valores */}
      <Card className="glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Tecido e Valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Tecido (valor base) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Tecido (valor base)
              </Label>
              <Select
                value={pricing.fabricId}
                onValueChange={(value) => setPricing(prev => ({ ...prev, fabricId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tecido" />
                </SelectTrigger>
                <SelectContent>
                  {fabrics.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} — {currency(pricing.priceMode === 'shirt_only' ? f.base_price_shirt_only : f.base_price_complete)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modo de preço */}
            <div className="space-y-2">
              <Label>Composição</Label>
              <Select
                value={pricing.priceMode}
                onValueChange={(value) => setPricing(prev => ({ ...prev, priceMode: value as 'complete' | 'shirt_only' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Conjunto completo</SelectItem>
                  <SelectItem value="shirt_only">Somente camisa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modelo de camisa (adicional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shirt className="h-4 w-4 text-muted-foreground" />
                Modelo de Camisa (adicional)
              </Label>
              <Select
                value={pricing.shirtTypeId}
                onValueChange={(value) => setPricing(prev => ({ ...prev, shirtTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {shirtTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.additional_price > 0 ? `(+${currency(s.additional_price)})` : '(sem adicional)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modelo de short (adicional) — apenas para conjunto */}
          {pricing.priceMode === 'complete' && (
            <div className="space-y-2 md:max-w-xs">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Modelo de Short (adicional)
              </Label>
              <Select
                value={pricing.shortTypeId}
                onValueChange={(value) => setPricing(prev => ({ ...prev, shortTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar short" />
                </SelectTrigger>
                <SelectContent>
                  {shortTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.additional_price > 0 ? `(+${currency(s.additional_price)})` : '(sem adicional)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Resumo do cálculo */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tecido (base)</span>
                <span className="font-medium">{currency(basePrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Adicional dos modelos</span>
                <span className="font-medium">{currency(modelPrice)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Valor por peça</span>
                <span className="font-semibold">{currency(unitPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total do pedido</span>
                <span className="text-lg font-bold text-primary">{currency(totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entrada ({downPaymentPercent}%)</span>
                <span className="font-semibold text-success">{currency(downPayment)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saldo restante</span>
                <span className="font-medium">{currency(remaining)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numeração de Time (apenas Camisa de Time) */}
      {isTeamShirt && (
        <Card className="glass border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                Numeração das Camisas
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="hasNumbering" className="text-sm text-muted-foreground cursor-pointer">
                  Tem numeração?
                </Label>
                <Switch
                  id="hasNumbering"
                  checked={formData.hasNumbering}
                  onCheckedChange={toggleNumbering}
                />
              </div>
            </div>
          </CardHeader>
          {showNumbering && (
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o número e o nome de cada jogador que aparecerá na camisa.
              </p>

              {/* Cabeçalho das colunas (desktop) */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_120px_40px] gap-3 px-1">
                <Label className="text-xs uppercase text-muted-foreground">Número</Label>
                <Label className="text-xs uppercase text-muted-foreground">Nome do Jogador</Label>
                <Label className="text-xs uppercase text-muted-foreground">Tamanho</Label>
                <span className="sr-only">Ações</span>
              </div>

              <div className="space-y-3">
                {formData.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="grid grid-cols-[64px_1fr_44px] sm:grid-cols-[80px_1fr_120px_40px] gap-3 items-center"
                  >
                    <div className="relative">
                      <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        aria-label={`Número do jogador ${index + 1}`}
                        placeholder="10"
                        className="pl-7 text-center font-semibold"
                        value={player.number}
                        onChange={(e) => updatePlayer(player.id, 'number', e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        aria-label={`Nome do jogador ${index + 1}`}
                        placeholder="Ex: Ronaldo"
                        className="pl-10"
                        value={player.name}
                        onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                      />
                    </div>
                    <Select
                      value={player.size || ''}
                      onValueChange={(value) => updatePlayer(player.id, 'size', value)}
                    >
                      <SelectTrigger className="hidden sm:flex" aria-label={`Tamanho do jogador ${index + 1}`}>
                        <SelectValue placeholder="Tam." />
                      </SelectTrigger>
                      <SelectContent>
                        {(['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'Infantil'] as const).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removePlayer(player.id)}
                      aria-label={`Remover jogador ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addPlayer}>
                  <Plus className="h-4 w-4" />
                  Adicionar Jogador
                </Button>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shirt className="h-4 w-4" />
                  {formData.players.length} {formData.players.length === 1 ? 'camisa numerada' : 'camisas numeradas'}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
