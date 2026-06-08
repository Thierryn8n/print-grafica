"use client"

import { useState, useEffect, useCallback } from "react"
import { listAssets, getAssetStats, toggleFavorite, deleteAsset, type DigitalAsset, type AssetCategory, ASSET_CATEGORIES } from "@/lib/dam/asset-service"
import { AssetUploadDialog } from "@/components/dam/asset-upload-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText, Image as ImageIcon, File, Upload, Search, Filter, Star, Trash2, Folder, Loader2, X, CheckSquare, Square } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ArquivosPage() {
  const [assets, setAssets] = useState<DigitalAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [stats, setStats] = useState({ total: 0, bySize: 0, favorites: 0 })
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState({
    category: undefined as AssetCategory | undefined,
    search: "",
    is_favorite: undefined as boolean | undefined,
  })

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAssets(filters)
      setAssets(data)
      const statsData = await getAssetStats()
      setStats(statsData)
    } catch (e) {
      console.error("[DAM] erro ao carregar assets:", e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  async function handleToggleFavorite(id: string, currentFavorite: boolean) {
    try {
      await toggleFavorite(id, !currentFavorite)
      loadAssets()
    } catch (e) {
      console.error("[DAM] erro ao favoritar:", e)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return
    
    try {
      await deleteAsset(id)
      toast({ title: "Arquivo excluído" })
      loadAssets()
    } catch (e) {
      console.error("[DAM] erro ao excluir:", e)
      toast({ title: "Erro ao excluir arquivo", variant: "destructive" })
    }
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

  function clearFilters() {
    setFilters({ category: undefined, search: "", is_favorite: undefined })
    setSelectedAssets(new Set())
  }

  function toggleSelectAsset(id: string) {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedAssets(newSelected)
  }

  function toggleSelectAll() {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set())
    } else {
      setSelectedAssets(new Set(assets.map(a => a.id)))
    }
  }

  async function handleBatchDownload() {
    const selected = assets.filter(a => selectedAssets.has(a.id))
    selected.forEach(asset => {
      window.open(asset.file_url, "_blank")
    })
    toast({
      title: "Download iniciado",
      description: `${selected.length} arquivo(s) sendo baixado(s)`,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Arquivos (DAM)</h1>
          <p className="text-muted-foreground">Sistema de gerenciamento de ativos digitais</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Novo Arquivo
        </Button>
      </div>

      <AssetUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={loadAssets}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Folder className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Arquivos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Favoritos</p>
                <p className="text-2xl font-bold">{stats.favorites}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <File className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamanho Total</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.bySize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por nome..."
            className="pl-9 h-11"
          />
        </div>
        <Select value={filters.category ?? "all"} onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? undefined : v as AssetCategory })}>
          <SelectTrigger className="h-11 w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {ASSET_CATEGORIES.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.is_favorite === undefined ? "all" : filters.is_favorite ? "true" : "false"} onValueChange={(v) => setFilters({ ...filters, is_favorite: v === "all" ? undefined : v === "true" })}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Favoritos</SelectItem>
            <SelectItem value="false">Não favoritos</SelectItem>
          </SelectContent>
        </Select>
        {(filters.category || filters.search || filters.is_favorite !== undefined) && (
          <Button variant="outline" onClick={clearFilters} className="h-11">
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {/* Batch Actions */}
      {selectedAssets.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{selectedAssets.size} arquivo(s) selecionado(s)</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={toggleSelectAll} variant="outline" size="sm">
              {selectedAssets.size === assets.length ? "Deselecionar todos" : "Selecionar todos"}
            </Button>
            <Button onClick={handleBatchDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download em lote
            </Button>
          </div>
        </div>
      )}

      {/* Assets Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum arquivo encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="p-2 hover:bg-muted rounded"
            >
              {selectedAssets.size === assets.length ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="text-sm text-muted-foreground">
              {selectedAssets.size === assets.length ? "Todos selecionados" : "Selecionar todos"}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${selectedAssets.has(asset.id) ? "ring-2 ring-primary" : ""}`}>
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {asset.file_type.startsWith("image/") ? (
                    <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      {getFileIcon(asset.file_type)}
                      <p className="text-xs text-muted-foreground mt-2">{asset.file_type}</p>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <button
                      onClick={() => toggleSelectAsset(asset.id)}
                      className="p-2 bg-background/80 hover:bg-background rounded"
                    >
                      {selectedAssets.has(asset.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    onClick={() => handleToggleFavorite(asset.id, asset.is_favorite)}
                  >
                    <Star className={`w-4 h-4 ${asset.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm truncate" title={asset.name}>
                    {asset.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {ASSET_CATEGORIES.find((c) => c.key === asset.category)?.label}
                    </Badge>
                    {asset.tags.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {asset.tags.length} tag(s)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(asset.file_size)}</span>
                    <span>{format(new Date(asset.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(asset.file_url, "_blank")}>
                      <Download className="w-3 h-3 mr-1" />
                      Baixar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(asset.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
