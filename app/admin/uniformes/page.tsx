"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Plus, Shirt, Users } from "lucide-react"
import type { SportType } from "@/lib/types"

const SPORT_LABELS: Record<SportType, string> = {
  futebol: "Futebol",
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Vôlei",
  handebol: "Handebol",
  corrida: "Corrida",
  ciclismo: "Ciclismo",
}

export default function UniformesPage() {
  const [uniformes, setUniformes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    sport: undefined as SportType | undefined,
    category: "",
    search: "",
  })

  useEffect(() => {
    loadUniformes()
  }, [filters])

  async function loadUniformes() {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from("orders")
      .select("*")
      .not("sport_type", "is", null)
      .order("created_at", { ascending: false })

    if (filters.sport) {
      query = query.eq("sport_type", filters.sport)
    }

    if (filters.search) {
      query = query.ilike("client_name", `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Uniformes] erro ao carregar:", error)
    } else {
      setUniformes(data || [])
    }

    setLoading(false)
  }

  function clearFilters() {
    setFilters({ sport: undefined, category: "", search: "" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Uniformes Esportivos</h1>
          <p className="text-muted-foreground">Gestão de uniformes por esporte</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Uniforme
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por cliente..."
            className="pl-9 h-11"
          />
        </div>
        <Select value={filters.sport ?? "all"} onValueChange={(v) => setFilters({ ...filters, sport: v === "all" ? undefined : v as SportType })}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos esportes</SelectItem>
            {Object.entries(SPORT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filters.sport || filters.search) && (
          <Button variant="outline" onClick={clearFilters} className="h-11">
            Limpar
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shirt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniformes.length}</p>
                <p className="text-xs text-muted-foreground">Total Uniformes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {uniformes.reduce((acc, u) => acc + u.quantity, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Peças</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uniformes List */}
      {uniformes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Shirt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum uniforme encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uniformes.map((uniforme) => (
            <Card key={uniforme.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{uniforme.client_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{uniforme.team_name || "Sem time"}</p>
                  </div>
                  <Badge>{SPORT_LABELS[uniforme.sport_type as SportType] || uniforme.sport_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Produto</p>
                    <p className="font-medium">{uniforme.product_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{uniforme.quantity} un</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {uniforme.size_pp > 0 && <Badge variant="outline" className="text-xs">PP: {uniforme.size_pp}</Badge>}
                  {uniforme.size_p > 0 && <Badge variant="outline" className="text-xs">P: {uniforme.size_p}</Badge>}
                  {uniforme.size_m > 0 && <Badge variant="outline" className="text-xs">M: {uniforme.size_m}</Badge>}
                  {uniforme.size_g > 0 && <Badge variant="outline" className="text-xs">G: {uniforme.size_g}</Badge>}
                  {uniforme.size_gg > 0 && <Badge variant="outline" className="text-xs">GG: {uniforme.size_gg}</Badge>}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {new Date(uniforme.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <Button size="sm" variant="ghost">
                    Ver detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
