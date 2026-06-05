"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, Trash2, Edit, Palette } from "lucide-react"
import { 
  getFabricTypes, 
  getOriginalColors, 
  getSublimatedSamples,
  createSublimatedSample,
  updateSublimatedSample,
  deleteSublimatedSample,
  uploadSampleCrop,
  type SublimatedColorSample,
  type FabricType,
  type OriginalColor
} from "@/lib/color/supabase-color-service"
import { rgbToLab, rgbToHex } from "@/lib/color/color-conversion"

export default function AdminColorSamplesPage() {
  const supabase = createClient()
  const [samples, setSamples] = useState<SublimatedColorSample[]>([])
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [originalColors, setOriginalColors] = useState<OriginalColor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSample, setEditingSample] = useState<SublimatedColorSample | null>(null)

  const [formData, setFormData] = useState({
    original_color_id: "",
    fabric_type_id: "",
    sample_crop_url: "",
    measured_rgb_r: "",
    measured_rgb_g: "",
    measured_rgb_b: "",
    printer_model: "",
    ink_type: "",
    paper_type: "",
    temperature: "",
    press_time_seconds: "",
    pressure_level: "",
    notes: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [samplesData, fabricTypesData, originalColorsData] = await Promise.all([
        getSublimatedSamples(),
        getFabricTypes(),
        getOriginalColors()
      ])
      setSamples(samplesData)
      setFabricTypes(fabricTypesData)
      setOriginalColors(originalColorsData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      original_color_id: "",
      fabric_type_id: "",
      sample_crop_url: "",
      measured_rgb_r: "",
      measured_rgb_g: "",
      measured_rgb_b: "",
      printer_model: "",
      ink_type: "",
      paper_type: "",
      temperature: "",
      press_time_seconds: "",
      pressure_level: "",
      notes: ""
    })
    setEditingSample(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const measuredRgb = {
      r: parseInt(formData.measured_rgb_r) || 0,
      g: parseInt(formData.measured_rgb_g) || 0,
      b: parseInt(formData.measured_rgb_b) || 0
    }
    
    const measuredLab = rgbToLab(measuredRgb)
    const measuredHex = rgbToHex(measuredRgb.r, measuredRgb.g, measuredRgb.b)

    const sampleData = {
      original_color_id: formData.original_color_id,
      fabric_type_id: formData.fabric_type_id,
      sample_crop_url: formData.sample_crop_url || null,
      measured_rgb_r: measuredRgb.r,
      measured_rgb_g: measuredRgb.g,
      measured_rgb_b: measuredRgb.b,
      measured_hex: measuredHex,
      measured_lab_l: measuredLab.l,
      measured_lab_a: measuredLab.a,
      measured_lab_b: measuredLab.b,
      printer_model: formData.printer_model || null,
      ink_type: formData.ink_type || null,
      paper_type: formData.paper_type || null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      press_time_seconds: formData.press_time_seconds ? parseInt(formData.press_time_seconds) : null,
      pressure_level: formData.pressure_level || null,
      notes: formData.notes || null
    }

    if (editingSample) {
      await updateSublimatedSample(editingSample.id, sampleData)
    } else {
      await createSublimatedSample(sampleData)
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  async function handleEdit(sample: SublimatedColorSample) {
    setEditingSample(sample)
    setFormData({
      original_color_id: sample.original_color_id,
      fabric_type_id: sample.fabric_type_id,
      sample_crop_url: sample.sample_crop_url || "",
      measured_rgb_r: sample.measured_rgb_r?.toString() || "",
      measured_rgb_g: sample.measured_rgb_g?.toString() || "",
      measured_rgb_b: sample.measured_rgb_b?.toString() || "",
      printer_model: sample.printer_model || "",
      ink_type: sample.ink_type || "",
      paper_type: sample.paper_type || "",
      temperature: sample.temperature?.toString() || "",
      press_time_seconds: sample.press_time_seconds?.toString() || "",
      pressure_level: sample.pressure_level || "",
      notes: sample.notes || ""
    })
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta amostra?")) return
    await deleteSublimatedSample(id)
    loadData()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const url = await uploadSampleCrop(file)
        setFormData({ ...formData, sample_crop_url: url })
      } catch (error) {
        console.error("Erro ao fazer upload:", error)
        alert("Erro ao fazer upload da imagem")
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const measuredRgb = {
      r: parseInt(formData.measured_rgb_r) || 0,
      g: parseInt(formData.measured_rgb_g) || 0,
      b: parseInt(formData.measured_rgb_b) || 0
    }
    
    const measuredLab = rgbToLab(measuredRgb)
    const measuredHex = rgbToHex(measuredRgb.r, measuredRgb.g, measuredRgb.b)

    const sampleData = {
      original_color_id: formData.original_color_id,
      fabric_type_id: formData.fabric_type_id,
      sample_crop_url: formData.sample_crop_url || null,
      measured_rgb_r: measuredRgb.r,
      measured_rgb_g: measuredRgb.g,
      measured_rgb_b: measuredRgb.b,
      measured_hex: measuredHex,
      measured_lab_l: measuredLab.l,
      measured_lab_a: measuredLab.a,
      measured_lab_b: measuredLab.b,
      printer_model: formData.printer_model || null,
      ink_type: formData.ink_type || null,
      paper_type: formData.paper_type || null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      press_time_seconds: formData.press_time_seconds ? parseInt(formData.press_time_seconds) : null,
      pressure_level: formData.pressure_level || null,
      notes: formData.notes || null
    }

    if (editingSample) {
      await updateSublimatedSample(editingSample.id, sampleData)
    } else {
      await createSublimatedSample(sampleData)
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  async function handleEdit(sample: SublimatedColorSample) {
    setEditingSample(sample)
    setFormData({
      original_color_id: sample.original_color_id,
      fabric_type_id: sample.fabric_type_id,
      sample_crop_url: sample.sample_crop_url || "",
      measured_rgb_r: sample.measured_rgb_r?.toString() || "",
      measured_rgb_g: sample.measured_rgb_g?.toString() || "",
      measured_rgb_b: sample.measured_rgb_b?.toString() || "",
      printer_model: sample.printer_model || "",
      ink_type: sample.ink_type || "",
      paper_type: sample.paper_type || "",
      temperature: sample.temperature?.toString() || "",
      press_time_seconds: sample.press_time_seconds?.toString() || "",
      pressure_level: sample.pressure_level || "",
      notes: sample.notes || ""
    })
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta amostra?")) return
    await deleteSublimatedSample(id)
    loadData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="original_color_id">Cor Original *</Label>
        <Select value={formData.original_color_id} onValueChange={(value) => setFormData({ ...formData, original_color_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a cor original" />
          </SelectTrigger>
          <SelectContent>
            {originalColors.map((color) => (
              <SelectItem key={color.id} value={color.id}>
                {color.code} - {color.name || 'Sem nome'} ({color.hex})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fabric_type_id">Tipo de Tecido *</Label>
        <Select value={formData.fabric_type_id} onValueChange={(value) => setFormData({ ...formData, fabric_type_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tecido" />
          </SelectTrigger>
          <SelectContent>
            {fabricTypes.map((fabric) => (
              <SelectItem key={fabric.id} value={fabric.id}>
                {fabric.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sample_crop">Imagem da Amostra</Label>
        <Input
          id="sample_crop"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        {formData.sample_crop_url && (
          <img src={formData.sample_crop_url} alt="Preview" className="w-32 h-32 object-cover rounded border" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="measured_rgb_r">RGB R *</Label>
          <Input
            id="measured_rgb_r"
            type="number"
            min="0"
            max="255"
            value={formData.measured_rgb_r}
            onChange={(e) => setFormData({ ...formData, measured_rgb_r: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="measured_rgb_g">RGB G *</Label>
          <Input
            id="measured_rgb_g"
            type="number"
            min="0"
            max="255"
            value={formData.measured_rgb_g}
            onChange={(e) => setFormData({ ...formData, measured_rgb_g: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="measured_rgb_b">RGB B *</Label>
          <Input
            id="measured_rgb_b"
            type="number"
            min="0"
            max="255"
            value={formData.measured_rgb_b}
            onChange={(e) => setFormData({ ...formData, measured_rgb_b: e.target.value })}
            required
          />
        </div>
      </div>

      {formData.measured_rgb_r && formData.measured_rgb_g && formData.measured_rgb_b && (
        <div className="flex items-center gap-2">
          <div
            className="w-12 h-12 rounded border"
            style={{
              backgroundColor: rgbToHex(
                parseInt(formData.measured_rgb_r),
                parseInt(formData.measured_rgb_g),
                parseInt(formData.measured_rgb_b)
              )
            }}
          />
          <span className="text-sm text-muted-foreground">
            {rgbToHex(
              parseInt(formData.measured_rgb_r),
              parseInt(formData.measured_rgb_g),
              parseInt(formData.measured_rgb_b)
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="printer_model">Modelo da Impressora</Label>
          <Input
            id="printer_model"
            value={formData.printer_model}
            onChange={(e) => setFormData({ ...formData, printer_model: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ink_type">Tipo de Tinta</Label>
          <Input
            id="ink_type"
            value={formData.ink_type}
            onChange={(e) => setFormData({ ...formData, ink_type: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paper_type">Tipo de Papel</Label>
          <Input
            id="paper_type"
            value={formData.paper_type}
            onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperatura (°C)</Label>
          <Input
            id="temperature"
            type="number"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="press_time_seconds">Tempo (segundos)</Label>
          <Input
            id="press_time_seconds"
            type="number"
            value={formData.press_time_seconds}
            onChange={(e) => setFormData({ ...formData, press_time_seconds: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pressure_level">Nível de Pressão</Label>
          <Input
            id="pressure_level"
            value={formData.pressure_level}
            onChange={(e) => setFormData({ ...formData, pressure_level: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit">
          {editingSample ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="w-8 h-8" />
            Banco de Cores Sublimadas
          </h1>
          <p className="text-muted-foreground">Gerencie as amostras de cores sublimadas em diferentes tecidos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="hidden md:flex">
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Amostra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSample ? "Editar Amostra" : "Nova Amostra"}</DialogTitle>
              </DialogHeader>
              {FormContent}
            </DialogContent>
          </Dialog>

          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Amostra
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh]">
              <SheetHeader>
                <SheetTitle>{editingSample ? "Editar Amostra" : "Nova Amostra"}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto">
                {FormContent}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total de Amostras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{samples.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dry-fit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samples.filter(s => s.fabric_types?.name === 'Dry-fit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Helanca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {samples.filter(s => s.fabric_types?.name === 'Helanca').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor Original</TableHead>
              <TableHead>Tecido</TableHead>
              <TableHead>RGB Medido</TableHead>
              <TableHead>HEX Medido</TableHead>
              <TableHead>Impressora</TableHead>
              <TableHead>Calibração</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((sample) => (
              <TableRow key={sample.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: sample.original_colors?.hex || '#000' }}
                    />
                    <div>
                      <div className="font-medium">{sample.original_colors?.code}</div>
                      <div className="text-xs text-muted-foreground">{sample.original_colors?.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sample.fabric_types?.name}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  RGB({sample.measured_rgb_r}, {sample.measured_rgb_g}, {sample.measured_rgb_b})
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: sample.measured_hex || '#000' }}
                    />
                    <span className="font-mono text-sm">{sample.measured_hex}</span>
                  </div>
                </TableCell>
                <TableCell>{sample.printer_model || '-'}</TableCell>
                <TableCell>
                  {sample.calibration_date ? new Date(sample.calibration_date).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(sample)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(sample.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {samples.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma amostra cadastrada. Clique em "Nova Amostra" para começar.
        </div>
      )}
    </div>
  )
}
