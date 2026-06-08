import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface BulkEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  onSuccess: () => void
}

export function BulkEditDialog({ open, onOpenChange, selectedIds, onSuccess }: BulkEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [fields, setFields] = useState({
    fabric_id: "",
    shirt_type_id: "",
    short_type_id: "",
    color: "",
    has_name: false,
    has_number: false,
  })

  const handleFieldChange = (field: string, value: any) => {
    setFields(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum item selecionado para edição",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // TODO: Implement bulk update logic using Supabase
      // This would update the selected form_items with the new values
      
      toast({
        title: "Sucesso",
        description: `${selectedIds.length} item(s) atualizado(s) com sucesso`,
      })
      
      onSuccess()
      onOpenChange(false)
      
      // Reset form
      setFields({
        fabric_id: "",
        shirt_type_id: "",
        short_type_id: "",
        color: "",
        has_name: false,
        has_number: false,
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar itens",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar em Massa ({selectedIds.length} itens)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Deixe os campos vazios para manter os valores atuais. Preencha apenas os campos que deseja alterar.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fabric">Tecido</Label>
              <Select
                value={fields.fabric_id}
                onValueChange={(value) => handleFieldChange("fabric_id", value)}
              >
                <SelectTrigger id="fabric">
                  <SelectValue placeholder="Selecione (manter atual)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manter atual</SelectItem>
                  {/* TODO: Load fabrics from database */}
                  <SelectItem value="1">Dry Fit</SelectItem>
                  <SelectItem value="2">Helanca</SelectItem>
                  <SelectItem value="3">Poliéster</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="shirt_type">Tipo de Camisa</Label>
              <Select
                value={fields.shirt_type_id}
                onValueChange={(value) => handleFieldChange("shirt_type_id", value)}
              >
                <SelectTrigger id="shirt_type">
                  <SelectValue placeholder="Selecione (manter atual)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manter atual</SelectItem>
                  {/* TODO: Load shirt types from database */}
                  <SelectItem value="1">Regata</SelectItem>
                  <SelectItem value="2">Manga Curta Gola Redonda</SelectItem>
                  <SelectItem value="3">Manga Curta Gola V</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="short_type">Tipo de Bermuda</Label>
              <Select
                value={fields.short_type_id}
                onValueChange={(value) => handleFieldChange("short_type_id", value)}
              >
                <SelectTrigger id="short_type">
                  <SelectValue placeholder="Selecione (manter atual)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manter atual</SelectItem>
                  {/* TODO: Load short types from database */}
                  <SelectItem value="1">Bermuda Curta</SelectItem>
                  <SelectItem value="2">Bermuda Longa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={fields.color}
                onChange={(e) => handleFieldChange("color", e.target.value)}
                placeholder="Deixe vazio para manter atual"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_name"
                checked={fields.has_name}
                onCheckedChange={(checked) => handleFieldChange("has_name", checked)}
              />
              <Label htmlFor="has_name">Incluir Nome</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_number"
                checked={fields.has_number}
                onCheckedChange={(checked) => handleFieldChange("has_number", checked)}
              />
              <Label htmlFor="has_number">Incluir Número</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
