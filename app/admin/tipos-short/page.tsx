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

interface ShortType {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category: string
  additional_price: number
  is_active: boolean
  sort_order: number
}

export default function TiposShortPage() {
  const supabase = createClient()
  const [shortTypes, setShortTypes] = useState<ShortType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShort, setEditingShort] = useState<ShortType | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "basic",
    additional_price: "",
    is_active: true,
    sort_order: "0",
    image_url: ""
  })

  useEffect(() => {
    loadShortTypes()
  }, [])

  async function loadShortTypes() {
    const { data } = await supabase
      .from("short_types")
      .select("*")
      .order("sort_order")
    
    if (data) setShortTypes(data)
    setLoading(false)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('short-types')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('short-types')
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
      additional_price: parseFloat(formData.additional_price) || 0,
      is_active: formData.is_active,
      sort_order: parseInt(formData.sort_order),
      image_url: formData.image_url || null
    }

    if (editingShort) {
      await supabase.from("short_types").update(payload).eq("id", editingShort.id)
    } else {
      await supabase.from("short_types").insert(payload)
    }

    setDialogOpen(false)
    resetForm()
    loadShortTypes()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este tipo de short?")) return
    
    await supabase.from("short_types").delete().eq("id", id)
    loadShortTypes()
  }

  function handleEdit(short: ShortType) {
    setEditingShort(short)
    setFormData({
      name: short.name,
      description: short.description || "",
      category: short.category,
      additional_price: short.additional_price?.toString() || "0",
      is_active: short.is_active,
      sort_order: short.sort_order.toString(),
      image_url: short.image_url || ""
    })
    setDialogOpen(true)
  }

  function resetForm() {
    setEditingShort(null)
    setFormData({
      name: "",
      description: "",
      category: "basic",
      additional_price: "",
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
          <h1 className="text-3xl font-bold">Tipos de Short</h1>
          <p className="text-muted-foreground">Gerencie os modelos de short disponíveis</p>
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
              <DialogTitle>{editingShort ? "Editar Tipo de Short" : "Novo Tipo de Short"}</DialogTitle>
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
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_price">Valor Adicional (R$)</Label>
                <Input
                  id="additional_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.additional_price}
                  onChange={(e) => setFormData({ ...formData, additional_price: e.target.value })}
                  placeholder="0.00"
                />
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

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {editingShort ? "Atualizar" : "Criar"}
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
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shortTypes.map((short) => (
              <TableRow key={short.id}>
                <TableCell>
                  {short.image_url ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                      <Image src={short.image_url} alt={short.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{short.name}</TableCell>
                <TableCell className="capitalize">{short.category}</TableCell>
                <TableCell className="max-w-xs truncate">{short.description}</TableCell>
                <TableCell>R$ {(short.additional_price || 0).toFixed(2)}</TableCell>
                <TableCell>{short.sort_order}</TableCell>
                <TableCell>
                  <Switch checked={short.is_active} disabled />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(short)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(short.id)}>
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
