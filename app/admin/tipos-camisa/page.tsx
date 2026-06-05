"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

interface ShirtType {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category: string
  has_sleeves: boolean
  sleeve_type: string | null
  collar_type: string | null
  is_active: boolean
  sort_order: number
}

export default function TiposCamisaPage() {
  const supabase = createClient()
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShirt, setEditingShirt] = useState<ShirtType | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "basic",
    has_sleeves: true,
    sleeve_type: "short",
    collar_type: "round",
    is_active: true,
    sort_order: "0",
    image_url: ""
  })

  useEffect(() => {
    loadShirtTypes()
  }, [])

  async function loadShirtTypes() {
    const { data } = await supabase
      .from("shirt_types")
      .select("*")
      .order("sort_order")
    
    if (data) setShirtTypes(data)
    setLoading(false)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('shirt-types')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('shirt-types')
      .getPublicUrl(filePath)

    setFormData({ ...formData, image_url: publicUrl })
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      has_sleeves: formData.has_sleeves,
      sleeve_type: formData.has_sleeves ? formData.sleeve_type : null,
      collar_type: formData.collar_type,
      is_active: formData.is_active,
      sort_order: parseInt(formData.sort_order),
      image_url: formData.image_url || null
    }

    if (editingShirt) {
      await supabase.from("shirt_types").update(payload).eq("id", editingShirt.id)
    } else {
      await supabase.from("shirt_types").insert(payload)
    }

    setDialogOpen(false)
    resetForm()
    loadShirtTypes()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este tipo de camisa?")) return
    
    await supabase.from("shirt_types").delete().eq("id", id)
    loadShirtTypes()
  }

  function handleEdit(shirt: ShirtType) {
    setEditingShirt(shirt)
    setFormData({
      name: shirt.name,
      description: shirt.description || "",
      category: shirt.category,
      has_sleeves: shirt.has_sleeves,
      sleeve_type: shirt.sleeve_type || "short",
      collar_type: shirt.collar_type || "round",
      is_active: shirt.is_active,
      sort_order: shirt.sort_order.toString(),
      image_url: shirt.image_url || ""
    })
    setDialogOpen(true)
  }

  function resetForm() {
    setEditingShirt(null)
    setFormData({
      name: "",
      description: "",
      category: "basic",
      has_sleeves: true,
      sleeve_type: "short",
      collar_type: "round",
      is_active: true,
      sort_order: "0",
      image_url: ""
    })
  }

  function sanitizeInput(value: string): string {
    return value.replace(/[<>]/g, '')
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipos de Camisa</h1>
          <p className="text-muted-foreground">Gerencie os modelos de camisa disponíveis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingShirt ? "Editar Tipo de Camisa" : "Novo Tipo de Camisa"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: sanitizeInput(e.target.value) })}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="sports">Esportivo</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="custom">Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: sanitizeInput(e.target.value) })}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Ordem</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    min="0"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="has_sleeves"
                    checked={formData.has_sleeves}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_sleeves: checked })}
                  />
                  <Label htmlFor="has_sleeves">Tem Mangas</Label>
                </div>
              </div>

              {formData.has_sleeves && (
                <div className="space-y-2">
                  <Label htmlFor="sleeve_type">Tipo de Manga</Label>
                  <Select value={formData.sleeve_type} onValueChange={(value) => setFormData({ ...formData, sleeve_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Curta</SelectItem>
                      <SelectItem value="long">Comprida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="collar_type">Tipo de Gola</Label>
                <Select value={formData.collar_type} onValueChange={(value) => setFormData({ ...formData, collar_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Redonda</SelectItem>
                    <SelectItem value="v-neck">Gola V</SelectItem>
                    <SelectItem value="polo">Polo</SelectItem>
                    <SelectItem value="none">Sem Gola</SelectItem>
                    <SelectItem value="raglan">Raglan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Imagem</Label>
                <div className="flex items-center gap-4">
                  {formData.image_url && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <Image src={formData.image_url} alt="Preview" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      disabled={uploading}
                    />
                    {uploading && <p className="text-sm text-muted-foreground mt-1">Enviando...</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {editingShirt ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Mangas</TableHead>
              <TableHead>Gola</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shirtTypes.map((shirt) => (
              <TableRow key={shirt.id}>
                <TableCell>
                  {shirt.image_url ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                      <Image src={shirt.image_url} alt={shirt.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{shirt.name}</TableCell>
                <TableCell className="capitalize">{shirt.category}</TableCell>
                <TableCell>
                  {shirt.has_sleeves ? (
                    <span className="capitalize">{shirt.sleeve_type === 'short' ? 'Curta' : 'Comprida'}</span>
                  ) : (
                    <span>Sem mangas</span>
                  )}
                </TableCell>
                <TableCell className="capitalize">
                  {shirt.collar_type === 'round' && 'Redonda'}
                  {shirt.collar_type === 'v-neck' && 'Gola V'}
                  {shirt.collar_type === 'polo' && 'Polo'}
                  {shirt.collar_type === 'none' && 'Sem gola'}
                  {shirt.collar_type === 'raglan' && 'Raglan'}
                </TableCell>
                <TableCell>{shirt.sort_order}</TableCell>
                <TableCell>
                  <Switch checked={shirt.is_active} disabled />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(shirt)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(shirt.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
