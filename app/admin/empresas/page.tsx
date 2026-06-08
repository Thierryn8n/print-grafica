"use client"

import { useState, useEffect, useCallback } from "react"
import { listCompanies, getCompanyStats, deleteCompany, type Company, type CompanyPlan, type CompanyStatus, COMPANY_PLANS } from "@/lib/companies/company-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus, Trash2, Users, Package, FolderOpen, Loader2, Search, MoreHorizontal, Check, X, AlertTriangle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stats, setStats] = useState<Record<string, { users: number; orders: number; clients: number; assets: number }>>({})

  const [filters, setFilters] = useState({
    plan: undefined as CompanyPlan | undefined,
    status: undefined as CompanyStatus | undefined,
    search: "",
  })

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "free" as CompanyPlan,
  })

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listCompanies(filters)
      setCompanies(data)
      
      // Load stats for each company
      const statsData: Record<string, any> = {}
      for (const company of data) {
        statsData[company.id] = await getCompanyStats(company.id)
      }
      setStats(statsData)
    } catch (e) {
      console.error("[Companies] erro ao carregar empresas:", e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const { createCompany } = await import("@/lib/companies/company-service")
      await createCompany({
        name: formData.name,
        slug: formData.slug,
        plan: formData.plan,
      })
      
      toast({ title: "Empresa criada com sucesso" })
      setDialogOpen(false)
      setFormData({ name: "", slug: "", plan: "free" })
      loadCompanies()
    } catch (e) {
      console.error("[Companies] erro ao criar empresa:", e)
      toast({ title: "Erro ao criar empresa", variant: "destructive" })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta empresa? Isso também excluirá todos os dados associados.")) return
    
    try {
      await deleteCompany(id)
      toast({ title: "Empresa excluída" })
      loadCompanies()
    } catch (e) {
      console.error("[Companies] erro ao excluir:", e)
      toast({ title: "Erro ao excluir empresa", variant: "destructive" })
    }
  }

  function getPlanBadge(plan: CompanyPlan) {
    const planInfo = COMPANY_PLANS.find(p => p.key === plan)
    return (
      <Badge variant={plan === "enterprise" ? "default" : plan === "pro" ? "secondary" : "outline"}>
        {planInfo?.label}
      </Badge>
    )
  }

  function getStatusBadge(status: CompanyStatus) {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Ativa</Badge>
      case "suspended":
        return <Badge className="bg-amber-500">Suspensa</Badge>
      case "cancelled":
        return <Badge className="bg-red-500">Cancelada</Badge>
    }
  }

  function clearFilters() {
    setFilters({ plan: undefined, status: undefined, search: "" })
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
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gestão de empresas (Multi-tenant SaaS)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: PrintFlow Studio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  required
                  placeholder="Ex: printflow-studio"
                />
                <p className="text-xs text-muted-foreground">Usado na URL: empresa.printflow.com</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plano *</Label>
                <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v as CompanyPlan })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_PLANS.map((plan) => (
                      <SelectItem key={plan.key} value={plan.key}>
                        {plan.label} - {plan.users === -1 ? "Ilimitado" : `${plan.users} usuários`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Empresa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
        <Select value={filters.plan ?? "all"} onValueChange={(v) => setFilters({ ...filters, plan: v === "all" ? undefined : v as CompanyPlan })}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos planos</SelectItem>
            {COMPANY_PLANS.map((plan) => (
              <SelectItem key={plan.key} value={plan.key}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v as CompanyStatus })}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="suspended">Suspensa</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        {(filters.plan || filters.status || filters.search) && (
          <Button variant="outline" onClick={clearFilters} className="h-11">
            Limpar
          </Button>
        )}
      </div>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma empresa encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => {
            const companyStats = stats[company.id] || { users: 0, orders: 0, clients: 0, assets: 0 }
            const planInfo = COMPANY_PLANS.find(p => p.key === company.plan)
            
            return (
              <Card key={company.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{company.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      {getPlanBadge(company.plan)}
                      {getStatusBadge(company.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{companyStats.users} usuários</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span>{companyStats.orders} pedidos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span>{companyStats.assets} arquivos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{companyStats.clients} clientes</span>
                    </div>
                  </div>

                  {/* Plan Limits */}
                  {planInfo && planInfo.users !== -1 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Usuários</span>
                        <span>{companyStats.users} / {planInfo.users}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            companyStats.users > planInfo.users ? "bg-red-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min((companyStats.users / planInfo.users) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Criada em {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(company.id)}
                      disabled={companyStats.users > 0 || companyStats.orders > 0}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
