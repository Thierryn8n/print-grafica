"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Image as ImageIcon, File, Upload } from "lucide-react"

interface OrderFile {
  id: string
  order_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  version: number
  is_mockup: boolean
  is_final: boolean
  created_at: string
}

export default function ArquivosPage() {
  const supabase = createClient()
  const [files, setFiles] = useState<OrderFile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    file_name: "",
    file_url: "",
    file_type: "application/pdf",
    is_mockup: false,
    is_final: false
  })

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    const { data } = await supabase
      .from("order_files")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (data) setFiles(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from("order_files").insert({
      order_id: "00000000-0000-0000-0000-000000000000",
      file_name: formData.file_name,
      file_url: formData.file_url,
      file_type: formData.file_type,
      is_mockup: formData.is_mockup,
      is_final: formData.is_final,
      version: 1
    })
    
    setDialogOpen(false)
    setFormData({ file_name: "", file_url: "", file_type: "application/pdf", is_mockup: false, is_final: false })
    loadFiles()
  }

  function getFileIcon(fileType: string) {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "-"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file_name">Nome do Arquivo *</Label>
        <Input
          id="file_name"
          value={formData.file_name}
          onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file_url">URL do Arquivo *</Label>
        <Input
          id="file_url"
          value={formData.file_url}
          onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
          required
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file_type">Tipo de Arquivo</Label>
        <Select value={formData.file_type} onValueChange={(value) => setFormData({ ...formData, file_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="application/pdf">PDF</SelectItem>
            <SelectItem value="image/png">PNG</SelectItem>
            <SelectItem value="image/jpeg">JPEG</SelectItem>
            <SelectItem value="image/svg+xml">SVG</SelectItem>
            <SelectItem value="application/zip">ZIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_mockup"
            checked={formData.is_mockup}
            onChange={(e) => setFormData({ ...formData, is_mockup: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="is_mockup">É Mockup</Label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_final"
            checked={formData.is_final}
            onChange={(e) => setFormData({ ...formData, is_final: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="is_final">É Final</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit">
          Upload
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arquivos</h1>
          <p className="text-muted-foreground">Arquivos enviados para os pedidos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild className="hidden md:flex">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Novo Arquivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Arquivo</DialogTitle>
              </DialogHeader>
              {FormContent}
            </DialogContent>
          </Dialog>

          <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Novo Arquivo
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Novo Arquivo</SheetTitle>
              </SheetHeader>
              {FormContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Mockup</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Enviado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {getFileIcon(file.file_type)}
                  {file.file_name}
                </TableCell>
                <TableCell>{file.file_type}</TableCell>
                <TableCell>{formatFileSize(file.file_size)}</TableCell>
                <TableCell>v{file.version}</TableCell>
                <TableCell>
                  {file.is_mockup ? (
                    <Badge variant="secondary">Sim</Badge>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {file.is_final ? (
                    <Badge className="bg-green-500">Sim</Badge>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(file.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => window.open(file.file_url, '_blank')}>
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {files.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum arquivo encontrado
        </div>
      )}
    </div>
  )
}
