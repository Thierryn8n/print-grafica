"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Upload, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"

interface Fabric {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_price_complete: number
  base_price_shirt_only: number
}

interface ShirtType {
  id: string
  name: string
  description: string | null
  image_url: string | null
  has_sleeves: boolean
  sleeve_type: string | null
  collar_type: string | null
}

interface ShortType {
  id: string
  name: string
  description: string | null
  image_url: string | null
}

interface FormItem {
  id: string
  set_name: string
  color: string
  fabric_id: string | null
  shirt_type_id: string | null
  short_type_id: string | null
  has_name: boolean
  has_number: boolean
  item_type: 'complete' | 'shirt_only'
  participants: Array<{
    id: string
    participant_name: string
    number: string
    shirt_size: string
    short_size: string
    observations: string
  }>
}

export default function FormularioPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formSubmitted, setFormSubmitted] = useState(false)
  
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([])
  const [shortTypes, setShortTypes] = useState<ShortType[]>([])
  
  const [formItems, setFormItems] = useState<FormItem[]>([])
  const [conceptUploads, setConceptUploads] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadFormData()
  }, [params.token])

  async function loadFormData() {
    const { data: formData, error: formError } = await supabase
      .from("public_forms")
      .select("*")
      .eq("form_token", params.token)
      .single()

    if (formError || !formData) {
      setError("Formulário não encontrado ou expirado")
      setLoading(false)
      return
    }

    if (formData.status === 'completed') {
      setFormSubmitted(true)
      setLoading(false)
      return
    }

    // Load fabrics, shirt types, and short types
    const [fabricsData, shirtTypesData, shortTypesData] = await Promise.all([
      supabase.from("fabrics").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("shirt_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("short_types").select("*").eq("is_active", true).order("sort_order")
    ])

    if (fabricsData.data) setFabrics(fabricsData.data)
    if (shirtTypesData.data) setShirtTypes(shirtTypesData.data)
    if (shortTypesData.data) setShortTypes(shortTypesData.data)

    // Load existing form items
    const { data: itemsData } = await supabase
      .from("form_items")
      .select("*, form_participants(*)")
      .eq("form_id", formData.id)

    if (itemsData) {
      const itemsWithParticipants = itemsData.map(item => ({
        id: item.id,
        set_name: item.set_name,
        color: item.color,
        fabric_id: item.fabric_id,
        shirt_type_id: item.shirt_type_id,
        short_type_id: item.short_type_id,
        has_name: item.has_name,
        has_number: item.has_number,
        item_type: item.item_type,
        participants: (item.form_participants || []).map((p: any) => ({
          id: p.id,
          participant_name: p.participant_name,
          number: p.number,
          shirt_size: p.shirt_size,
          short_size: p.short_size,
          observations: p.observations
        }))
      }))
      setFormItems(itemsWithParticipants)
    }

    setLoading(false)
  }

  function sanitizeInput(value: string): string {
    return value.replace(/[<>]/g, '').trim()
  }

  function addFormItem() {
    const newItem: FormItem = {
      id: Date.now().toString(),
      set_name: "",
      color: "",
      fabric_id: null,
      shirt_type_id: null,
      short_type_id: null,
      has_name: false,
      has_number: false,
      item_type: "complete",
      participants: []
    }
    setFormItems([...formItems, newItem])
  }

  function updateFormItem(id: string, updates: Partial<FormItem>) {
    setFormItems(formItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  function removeFormItem(id: string) {
    setFormItems(formItems.filter(item => item.id !== id))
  }

  function addParticipant(itemId: string) {
    setFormItems(formItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          participants: [
            ...item.participants,
            {
              id: Date.now().toString(),
              participant_name: "",
              number: "",
              shirt_size: "M",
              short_size: "M",
              observations: ""
            }
          ]
        }
      }
      return item
    }))
  }

  function updateParticipant(itemId: string, participantId: string, updates: any) {
    setFormItems(formItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          participants: item.participants.map(p =>
            p.id === participantId ? { ...p, ...updates } : p
          )
        }
      }
      return item
    }))
  }

  function removeParticipant(itemId: string, participantId: string) {
    setFormItems(formItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          participants: item.participants.filter(p => p.id !== participantId)
        }
      }
      return item
    }))
  }

  function calculateItemPrice(item: FormItem): number {
    const fabric = fabrics.find(f => f.id === item.fabric_id)
    if (!fabric) return 0

    const basePrice = item.item_type === 'complete' 
      ? fabric.base_price_complete 
      : fabric.base_price_shirt_only

    return basePrice * item.participants.length
  }

  function calculateTotalPrice(): number {
    return formItems.reduce((total, item) => total + calculateItemPrice(item), 0)
  }

  async function handleSubmit() {
    setUploading(true)
    setError("")

    try {
      // Validate all items
      for (const item of formItems) {
        if (!item.set_name || !item.color || !item.fabric_id || !item.shirt_type_id) {
          throw new Error("Preencha todos os campos obrigatórios de cada conjunto")
        }

        if (item.item_type === 'complete' && !item.short_type_id) {
          throw new Error("Selecione o tipo de short para conjuntos completos")
        }

        if (item.participants.length === 0) {
          throw new Error(`Adicione pelo menos um participante ao conjunto "${item.set_name}"`)
        }

        for (const participant of item.participants) {
          if (!participant.participant_name || !participant.shirt_size) {
            throw new Error("Preencha nome e tamanho da camisa de todos os participantes")
          }

          if (item.has_number && !participant.number) {
            throw new Error("Preencha o número de todos os participantes")
          }

          if (item.item_type === 'complete' && participant.short_size === 'none') {
            throw new Error("Selecione o tamanho do short para conjuntos completos")
          }
        }
      }

      // Get form data
      const { data: formData } = await supabase
        .from("public_forms")
        .select("*")
        .eq("form_token", params.token)
        .single()

      if (!formData) throw new Error("Formulário não encontrado")

      // Update form status
      await supabase
        .from("public_forms")
        .update({ status: 'in_progress' })
        .eq("id", formData.id)

      // Delete existing items and participants
      const { data: existingItems } = await supabase
        .from("form_items")
        .select("id")
        .eq("form_id", formData.id)

      if (existingItems && existingItems.length > 0) {
        await supabase
          .from("form_items")
          .delete()
          .eq("form_id", formData.id)
      }

      // Insert new items and participants
      for (const item of formItems) {
        const { data: itemData } = await supabase
          .from("form_items")
          .insert({
            form_id: formData.id,
            set_name: sanitizeInput(item.set_name),
            color: sanitizeInput(item.color),
            fabric_id: item.fabric_id,
            shirt_type_id: item.shirt_type_id,
            short_type_id: item.short_type_id,
            has_name: item.has_name,
            has_number: item.has_number,
            item_type: item.item_type,
            total_quantity: item.participants.length,
            estimated_price: calculateItemPrice(item)
          })
          .select()
          .single()

        if (itemData) {
          for (const participant of item.participants) {
            await supabase
              .from("form_participants")
              .insert({
                form_item_id: itemData.id,
                participant_name: sanitizeInput(participant.participant_name),
                number: sanitizeInput(participant.number),
                shirt_size: participant.shirt_size,
                short_size: participant.short_size,
                observations: sanitizeInput(participant.observations)
              })
          }
        }
      }

      // Upload concept images
      for (const file of conceptUploads) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${formData.id}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('form-concepts')
          .upload(filePath, file)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('form-concepts')
            .getPublicUrl(filePath)

          await supabase
            .from("form_concept_uploads")
            .insert({
              form_id: formData.id,
              file_name: sanitizeInput(file.name),
              file_url: publicUrl,
              file_type: file.type,
              file_size: file.size
            })
        }
      }

      setFormSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Erro ao enviar formulário")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando formulário...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Erro</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Formulário Enviado!</h2>
              <p className="text-muted-foreground mb-4">
                Seu pedido foi enviado com sucesso. Entraremos em contato em breve.
              </p>
              <Button onClick={() => router.push('/')}>
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Formulário de Pedido</h1>
          <p className="text-muted-foreground">Preencha as informações do seu pedido de uniformes</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Concept Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Upload de Conceitos/Artes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setConceptUploads([...conceptUploads, ...files])
                    }}
                  />
                  <Button type="button" variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                </div>
                {conceptUploads.length > 0 && (
                  <div className="space-y-2">
                    {conceptUploads.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setConceptUploads(conceptUploads.filter((_, i) => i !== index))
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Items */}
          {formItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Conjunto: {item.set_name || "Novo Conjunto"}</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFormItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Conjunto *</Label>
                    <Input
                      value={item.set_name}
                      onChange={(e) => updateFormItem(item.id, { set_name: sanitizeInput(e.target.value) })}
                      placeholder="Ex: Uniforme Branco"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor *</Label>
                    <Input
                      value={item.color}
                      onChange={(e) => updateFormItem(item.id, { color: sanitizeInput(e.target.value) })}
                      placeholder="Ex: Branco"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tecido *</Label>
                    <Select
                      value={item.fabric_id || ""}
                      onValueChange={(value) => updateFormItem(item.id, { fabric_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {fabrics.map((fabric) => (
                          <SelectItem key={fabric.id} value={fabric.id}>
                            {fabric.name} - R$ {fabric.base_price_complete.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Camisa *</Label>
                    <Select
                      value={item.shirt_type_id || ""}
                      onValueChange={(value) => updateFormItem(item.id, { shirt_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {shirtTypes.map((shirt) => (
                          <SelectItem key={shirt.id} value={shirt.id}>
                            {shirt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Item *</Label>
                    <Select
                      value={item.item_type}
                      onValueChange={(value: 'complete' | 'shirt_only') => updateFormItem(item.id, { item_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="complete">Conjunto Completo</SelectItem>
                        <SelectItem value="shirt_only">Apenas Camisa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {item.item_type === 'complete' && (
                  <div className="space-y-2">
                    <Label>Tipo de Short *</Label>
                    <Select
                      value={item.short_type_id || ""}
                      onValueChange={(value) => updateFormItem(item.id, { short_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {shortTypes.map((short) => (
                          <SelectItem key={short.id} value={short.id}>
                            {short.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.has_name}
                      onCheckedChange={(checked) => updateFormItem(item.id, { has_name: checked })}
                    />
                    <Label>Com Nome</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.has_number}
                      onCheckedChange={(checked) => updateFormItem(item.id, { has_number: checked })}
                    />
                    <Label>Com Número</Label>
                  </div>
                </div>

                {/* Participants */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Participantes ({item.participants.length})</Label>
                    <Button size="sm" onClick={() => addParticipant(item.id)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {item.participants.map((participant) => (
                    <div key={participant.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Participante</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeParticipant(item.id, participant.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome *</Label>
                          <Input
                            value={participant.participant_name}
                            onChange={(e) => updateParticipant(item.id, participant.id, { participant_name: sanitizeInput(e.target.value) })}
                            placeholder="Nome do participante"
                            maxLength={100}
                          />
                        </div>
                        {item.has_number && (
                          <div className="space-y-2">
                            <Label>Número *</Label>
                            <Input
                              value={participant.number}
                              onChange={(e) => updateParticipant(item.id, participant.id, { number: sanitizeInput(e.target.value) })}
                              placeholder="Número"
                              maxLength={10}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tamanho Camisa *</Label>
                          <Select
                            value={participant.shirt_size}
                            onValueChange={(value) => updateParticipant(item.id, participant.id, { shirt_size: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PP">PP</SelectItem>
                              <SelectItem value="P">P</SelectItem>
                              <SelectItem value="M">M</SelectItem>
                              <SelectItem value="G">G</SelectItem>
                              <SelectItem value="GG">GG</SelectItem>
                              <SelectItem value="XG">XG</SelectItem>
                              <SelectItem value="XGG">XGG</SelectItem>
                              <SelectItem value="infantil">Infantil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {item.item_type === 'complete' && (
                          <div className="space-y-2">
                            <Label>Tamanho Short *</Label>
                            <Select
                              value={participant.short_size}
                              onValueChange={(value) => updateParticipant(item.id, participant.id, { short_size: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PP">PP</SelectItem>
                                <SelectItem value="P">P</SelectItem>
                                <SelectItem value="M">M</SelectItem>
                                <SelectItem value="G">G</SelectItem>
                                <SelectItem value="GG">GG</SelectItem>
                                <SelectItem value="XG">XG</SelectItem>
                                <SelectItem value="XGG">XGG</SelectItem>
                                <SelectItem value="infantil">Infantil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={participant.observations}
                          onChange={(e) => updateParticipant(item.id, participant.id, { observations: sanitizeInput(e.target.value) })}
                          placeholder="Observações adicionais"
                          maxLength={200}
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Subtotal: {item.participants.length} peças</span>
                  <span className="font-bold text-lg">R$ {calculateItemPrice(item).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addFormItem} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Novo Conjunto
          </Button>

          {/* Total */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total do Pedido</p>
                  <p className="text-2xl font-bold">{formItems.reduce((total, item) => total + item.participants.length, 0)} peças</p>
                </div>
                <p className="text-3xl font-bold text-primary">R$ {calculateTotalPrice().toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={uploading || formItems.length === 0}
          >
            {uploading ? "Enviando..." : "Enviar Pedido"}
          </Button>
        </div>
      </main>
    </div>
  )
}
