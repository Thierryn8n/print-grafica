"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Client, Profile } from "@/lib/types"
import { PRODUCT_TYPES } from "@/lib/types"
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  User,
  Package,
  FileText,
  Calendar,
  DollarSign,
  Palette,
  Shirt,
  Image as ImageIcon,
  Users
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { ColorAnalysisPanel } from "@/components/color/ColorAnalysisPanel"

const MODEL_TYPES = [
  { value: "manga-curta", label: "Manga Curta" },
  { value: "manga-longa", label: "Manga Longa" },
  { value: "gola-careca", label: "Gola Careca" },
  { value: "gola-alta", label: "Gola Alta" },
  { value: "gola-polo", label: "Gola Polo" },
  { value: "regata", label: "Regata" },
  { value: "short", label: "Short" },
  { value: "conjunto", label: "Conjunto" },
  { value: "outro", label: "Outro" }
]

export default function NovoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [designers, setDesigners] = useState<Profile[]>([])
  
  const [formData, setFormData] = useState({
    clientId: "",
    clientName: "",
    clientPhone: "",
    teamName: "",
    productType: "",
    quantity: 1,
    
    // Tamanhos
    sizePP: 0,
    sizeP: 0,
    sizeM: 0,
    sizeG: 0,
    sizeGG: 0,
    sizeXG: 0,
    sizeXGG: 0,
    sizeInfantil: 0,
    sizeCustom: "",
    
    // Modelo
    model: "manga-curta" as string,
    
    description: "",
    colors: "",
    logosUrl: "",
    referenceImageUrl: "",
    aiMockupUrl: "",
    
    priority: "media" as "baixa" | "media" | "alta" | "urgente",
    deadline: "",
    totalValue: "",
    designerId: "",
    notes: ""
  })

  const [useExistingClient, setUseExistingClient] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: clientsData } = await supabase
      .from("clients")
      .select("*")
      .order("name")

    const { data: designersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "designer")
      .eq("status", "approved")
      .order("full_name")

    if (clientsData) setClients(clientsData)
    if (designersData) setDesigners(designersData)
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})/, "($1) ")
        .replace(/(\d{5})(\d)/, "$1-$2")
    }
    return value.slice(0, 15)
  }

  function formatCurrency(value: string) {
    const numbers = value.replace(/\D/g, "")
    if (!numbers) return ""
    const amount = parseInt(numbers) / 100
    return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  async function generateOrderNumber() {
    const supabase = createClient()
    const date = new Date()
    const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
    
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .like("order_number", `${prefix}%`)

    const sequence = String((count || 0) + 1).padStart(4, "0")
    return `${prefix}${sequence}`
  }

  const calculateTotalQuantity = () => {
    return formData.sizePP + formData.sizeP + formData.sizeM + 
           formData.sizeG + formData.sizeGG + formData.sizeXG + 
           formData.sizeXGG + formData.sizeInfantil
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const orderNumber = await generateOrderNumber()
    const totalValue = formData.totalValue 
      ? parseFloat(formData.totalValue.replace(/[^\d,]/g, "").replace(",", "."))
      : null

    const totalQuantity = calculateTotalQuantity() || formData.quantity

    // If creating new client, save them first
    let clientId = formData.clientId || null
    if (!useExistingClient && formData.clientName) {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({
          name: formData.clientName,
          phone: formData.clientPhone.replace(/\D/g, ""),
          created_by: user.id
        })
        .select()
        .single()

      if (newClient) {
        clientId = newClient.id
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        client_id: clientId,
        client_name: useExistingClient 
          ? clients.find(c => c.id === formData.clientId)?.name || formData.clientName
          : formData.clientName,
        client_phone: formData.clientPhone.replace(/\D/g, ""),
        team_name: formData.teamName,
        product_type: formData.productType,
        quantity: totalQuantity,
        size_pp: formData.sizePP,
        size_p: formData.sizeP,
        size_m: formData.sizeM,
        size_g: formData.sizeG,
        size_gg: formData.sizeGG,
        size_xg: formData.sizeXG,
        size_xgg: formData.sizeXGG,
        size_infantil: formData.sizeInfantil,
        size_custom: formData.sizeCustom || null,
        model: formData.model,
        description: formData.description || null,
        colors: formData.colors || null,
        logos_url: formData.logosUrl || null,
        reference_image_url: formData.referenceImageUrl || null,
        ai_mockup_url: formData.aiMockupUrl || null,
        priority: formData.priority,
        deadline: formData.deadline || null,
        total_value: totalValue,
        designer_id: formData.designerId || null,
        notes: formData.notes || null,
        created_by: user.id,
        status: "briefing"
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("Erro ao criar pedido")
      setLoading(false)
      return
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      order_id: data.id,
      user_id: user.id,
      action: "order_created",
      description: `Pedido #${orderNumber} criado`
    })

    router.push("/admin/kanban")
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kanban">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Novo Pedido</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre um novo pedido de produção
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!useExistingClient ? "default" : "outline"}
                size="sm"
                onClick={() => setUseExistingClient(false)}
              >
                Novo Cliente
              </Button>
              <Button
                type="button"
                variant={useExistingClient ? "default" : "outline"}
                size="sm"
                onClick={() => setUseExistingClient(true)}
                disabled={clients.length === 0}
              >
                Cliente Existente
              </Button>
            </div>

            {useExistingClient ? (
              <div className="space-y-2">
                <Label>Selecionar Cliente</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => {
                    const client = clients.find(c => c.id === value)
                    setFormData({
                      ...formData,
                      clientId: value,
                      clientName: client?.name || "",
                      clientPhone: client?.phone || ""
                    })
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nome do Cliente *</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Nome completo"
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientPhone">Telefone *</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      required
                      className="h-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamName">Nome da Equipe/Empresa</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    placeholder="Nome da equipe ou empresa"
                    className="h-12"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Produto e Modelo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" />
              Produto e Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Produto *</Label>
                <Select
                  value={formData.productType}
                  onValueChange={(value) => setFormData({ ...formData, productType: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => setFormData({ ...formData, model: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade de Tamanhos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Grade de Tamanhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {[ 
                { label: "PP", field: "sizePP" },
                { label: "P", field: "sizeP" },
                { label: "M", field: "sizeM" },
                { label: "G", field: "sizeG" },
                { label: "GG", field: "sizeGG" },
                { label: "XG", field: "sizeXG" },
                { label: "XGG", field: "sizeXGG" },
                { label: "Infantil", field: "sizeInfantil" }
              ].map(({ label, field }) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })}
                    className="h-10 text-center"
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Quantidade</span>
                <span className="text-lg font-bold text-primary">
                  {calculateTotalQuantity() || formData.quantity} unidades
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="sizeCustom">Tamanho Personalizado (opcional)</Label>
              <Input
                id="sizeCustom"
                value={formData.sizeCustom}
                onChange={(e) => setFormData({ ...formData, sizeCustom: e.target.value })}
                placeholder="Outros tamanhos..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Arte e Referências */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Arte e Referências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colors">Cores Principais</Label>
              <Input
                id="colors"
                value={formData.colors}
                onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                placeholder="Ex: Preto, Branco, Laranja..."
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logosUrl">URL dos Logos</Label>
                <Input
                  id="logosUrl"
                  value={formData.logosUrl}
                  onChange={(e) => setFormData({ ...formData, logosUrl: e.target.value })}
                  placeholder="Link para os logos..."
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceImageUrl">URL Imagem de Referência</Label>
                <Input
                  id="referenceImageUrl"
                  value={formData.referenceImageUrl}
                  onChange={(e) => setFormData({ ...formData, referenceImageUrl: e.target.value })}
                  placeholder="Link para imagem..."
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição / Especificações</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre cores, estampas, observações..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: "baixa" | "media" | "alta" | "urgente") => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Prazo de Entrega
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalValue" className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Valor Total
                </Label>
                <Input
                  id="totalValue"
                  value={formData.totalValue}
                  onChange={(e) => setFormData({ ...formData, totalValue: formatCurrency(e.target.value) })}
                  placeholder="R$ 0,00"
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Designer Responsável
              </Label>
              <Select
                value={formData.designerId}
                onValueChange={(value) => setFormData({ ...formData, designerId: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecionar designer (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((designer) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações Internas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas visíveis apenas para a equipe..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <ColorAnalysisPanel 
          onAnalysisComplete={(results) => {
            console.log('Análise de cores completada:', results)
            // Aqui você pode salvar a análise no pedido se necessário
          }}
        />

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando pedido...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Criar Pedido
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
