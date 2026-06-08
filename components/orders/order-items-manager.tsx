"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Upload, Plus, Trash2, Pencil, Save, X, Layers } from "lucide-react"
import type { OrderItem } from "@/lib/types"
import {
  listOrderItems,
  createOrderItem,
  updateOrderItem,
  deleteOrderItem,
  bulkUpdateOrderItems,
} from "@/lib/orders/order-items-service"
import { ImportDialog } from "./import-dialog"
import { toast } from "@/components/ui/use-toast"

const SIZES = ["PP", "P", "M", "G", "GG", "XG", "XGG", "Infantil"]

interface OrderItemsManagerProps {
  orderId: string
}

export function OrderItemsManager({ orderId }: OrderItemsManagerProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<OrderItem>>({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSize, setBulkSize] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listOrderItems(orderId))
    } catch {
      toast({ title: "Erro ao carregar itens", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))))
  }

  async function handleAdd() {
    try {
      const created = await createOrderItem({ order_id: orderId, player_name: "Novo item", quantity: 1 })
      setItems((prev) => [...prev, created])
      startEdit(created)
    } catch {
      toast({ title: "Erro ao adicionar item", variant: "destructive" })
    }
  }

  function startEdit(item: OrderItem) {
    setEditingId(item.id)
    setEditDraft({
      player_name: item.player_name,
      player_number: item.player_number,
      size: item.size,
      position: item.position,
      quantity: item.quantity,
    })
  }

  async function saveEdit(id: string) {
    try {
      const updated = await updateOrderItem(id, editDraft)
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      setEditingId(null)
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOrderItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      setSelected((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
  }

  async function handleBulkSize() {
    if (!bulkSize) return
    try {
      const ids = Array.from(selected)
      await bulkUpdateOrderItems(ids, { size: bulkSize })
      setItems((prev) => prev.map((i) => (selected.has(i.id) ? { ...i, size: bulkSize } : i)))
      setBulkOpen(false)
      setBulkSize("")
      toast({ title: "Edição em massa aplicada", description: `${ids.length} item(ns) atualizados.` })
    } catch {
      toast({ title: "Erro na edição em massa", variant: "destructive" })
    }
  }

  async function handleBulkDelete() {
    try {
      const ids = Array.from(selected)
      for (const id of ids) await deleteOrderItem(id)
      setItems((prev) => prev.filter((i) => !selected.has(i.id)))
      setSelected(new Set())
      toast({ title: "Itens removidos", description: `${ids.length} item(ns) excluídos.` })
    } catch {
      toast({ title: "Erro ao excluir em massa", variant: "destructive" })
    }
  }

  const totalQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Jogadores / Itens
          <Badge variant="secondary">{items.length}</Badge>
          {totalQty > 0 && <span className="text-sm font-normal text-muted-foreground">({totalQty} peças)</span>}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Importar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Layers className="mr-1 h-4 w-4" /> Editar tamanho em massa
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Excluir selecionados
            </Button>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum item ainda. Adicione manualmente ou importe uma planilha.</p>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1 h-4 w-4" /> Importar planilha
            </Button>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === items.length && items.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-20">Número</TableHead>
                  <TableHead className="w-24">Tamanho</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead className="w-16">Qtd</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDraft.player_name ?? ""}
                            onChange={(e) => setEditDraft((d) => ({ ...d, player_name: e.target.value }))}
                            className="h-8"
                          />
                        ) : (
                          item.player_name || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDraft.player_number ?? ""}
                            onChange={(e) => setEditDraft((d) => ({ ...d, player_number: e.target.value }))}
                            className="h-8"
                          />
                        ) : (
                          item.player_number || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editDraft.size ?? ""}
                            onValueChange={(v) => setEditDraft((d) => ({ ...d, size: v }))}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {SIZES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : item.size ? (
                          <Badge variant="outline">{item.size}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDraft.position ?? ""}
                            onChange={(e) => setEditDraft((d) => ({ ...d, position: e.target.value }))}
                            className="h-8"
                          />
                        ) : (
                          item.position || "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={1}
                            value={editDraft.quantity ?? 1}
                            onChange={(e) => setEditDraft((d) => ({ ...d, quantity: Number.parseInt(e.target.value) || 1 }))}
                            className="h-8 w-16"
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(item.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ImportDialog orderId={orderId} open={importOpen} onOpenChange={setImportOpen} onImported={load} />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar tamanho em massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Aplicar tamanho a {selected.size} item(ns)</Label>
            <Select value={bulkSize} onValueChange={setBulkSize}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkSize} disabled={!bulkSize}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
