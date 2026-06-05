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
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

interface Fabric {
  id: string
  name: string
  description: string | null
  image_url: string | null
  base_price_complete: number
  base_price_shirt_only: number
  is_active: boolean
  sort_order: number
}

export default function TecidosPage() {
  const supabase = createClient()
  const [fabrics, setFabrics] = useState<Fabric[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price_complete: "",
    base_price_shirt_only: "",
    is_active: true,
    sort_order: "0",
    image_url: ""
  })

  useEffect(() => {
    loadFabrics()
  }, [])

  async function loadFabrics() {
    const { data } = await supabase
      .from("fabrics")
      .select("*")
      .order("sort_order")
    
    if (data) setFabrics(data)
    setLoading(false)
  }

  async function handleImageUpload(file: File) {
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('fabrics')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('fabrics')
      .getPublicUrl(filePath)

    setFormData({ ...formData, image_url: publicUrl })
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      description: formData.description,
      base_price_complete: parseFloat(formData.base_price_complete),
      base_price_shirt_only: parseFloat(formData.base_price_shirt_only),
      is_active: formData.is_active,
      sort_order: parseInt(formData.sort_order),
      image_url: formData.image_url || null
    }

    if (editingFabric) {
      await supabase.from("fabrics").update(payload).eq("id", editingFabric.id)
    } else {
      await supabase.from("fabrics").insert(payload)
    }

    setDialogOpen(false)
    resetForm()
    loadFabrics()
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este tecido?")) return
    
    await supabase.from("fabrics").delete().eq("id", id)
    loadFabrics()
  }

  function handleEdit(fabric: Fabric) {
    setEditingFabric(fabric)
    setFormData({
      name: fabric.name,
      description: fabric.description || "",
      base_price_complete: fabric.base_price_complete.toString(),
      base_price_shirt_only: fabric.base_price_shirt_only.toString(),
      is_active: fabric.is_active,
      sort_order: fabric.sort_order.toString(),
      image_url: fabric.image_url || ""
    })
    setDialogOpen(true)
  }

  function resetForm() {
    setEditingFabric(null)
    setFormData({
      name: "",
      description: "",
      base_price_complete: "",
      base_price_shirt_only: "",
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
          <h1 className="text-3xl font-bold">Tecidos</h1>
          <p className="text-muted-foreground">Gerencie os tipos de tecidos disponíveis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Tecido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFabric ? "Editar Tecido" : "Novo Tecido"}</DialogTitle>
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
                  <Label htmlFor="sort_order">Ordem</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    min="0"
                  />
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
                  <Label htmlFor="base_price_complete">Preço Completo (R$) *</Label>
                  <Input
                    id="base_price_complete"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price_complete}
                    onChange={(e) => setFormData({ ...formData, base_price_complete: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_price_shirt_only">Preço Apenas Camisa (R$) *</Label>
                  <Input
                    id="base_price_shirt_only"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price_shirt_only}
                    onChange={(e) => setFormData({ ...formData, base_price_shirt_only: e.target.value })}
                    required
                  />
                </div>
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
                  {editingFabric ? "Atualizar" : "Criar"}
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
              <TableHead>Descrição</TableHead>
              <TableHead>Preço Completo</TableHead>
              <TableHead>Preço Camisa</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fabrics.map((fabric) => (
              <TableRow key={fabric.id}>
                <TableCell>
                  {fabric.image_url ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                      <Image src={fabric.image_url} alt={fabric.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{fabric.name}</TableCell>
                <TableCell className="max-w-xs truncate">{fabric.description}</TableCell>
                <TableCell>R$ {fabric.base_price_complete.toFixed(2)}</TableCell>
                <TableCell>R$ {fabric.base_price_shirt_only.toFixed(2)}</TableCell>
                <TableCell>{fabric.sort_order}</TableCell>
                <TableCell>
                  <Switch checked={fabric.is_active} disabled />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(fabric)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(fabric.id)}>
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
