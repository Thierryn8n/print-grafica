"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Search, Shield, User, Save, RefreshCw } from "lucide-react"
import type { Profile, UserRole } from "@/lib/types"
import type { Permission } from "@/lib/rbac/permissions"
import { ROLE_LABELS, ROLE_PERMISSIONS, hasPermission } from "@/lib/rbac/permissions"
import { toast } from "@/components/ui/use-toast"

export default function PermissoesPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  async function loadUsers() {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error("[Permissoes] erro ao carregar:", error)
    } else {
      setUsers(data || [])
    }

    setLoading(false)
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)

    if (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Perfil atualizado",
        description: "O perfil do usuário foi atualizado com sucesso.",
      })
      loadUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole })
      }
    }

    setSaving(false)
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    setSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", userId)

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Status atualizado",
        description: "O status do usuário foi atualizado com sucesso.",
      })
      loadUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, status: newStatus })
      }
    }

    setSaving(false)
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Permissões</h1>
          <p className="text-muted-foreground">Gerencie perfis e permissões dos usuários</p>
        </div>
        <Button onClick={loadUsers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-9 h-11"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="h-11 w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos perfis</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Users List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Usuários</h2>
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className={`cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge>{ROLE_LABELS[user.role as UserRole]}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* User Details */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Detalhes do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <p className="font-medium">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label>Perfil Atual</Label>
                    <Select
                      value={selectedUser.role}
                      onValueChange={(v) => updateUserRole(selectedUser.id, v as UserRole)}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selectedUser.status}
                      onValueChange={(v) => updateUserStatus(selectedUser.id, v)}
                      disabled={saving}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="rejected">Rejeitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Permissões do Perfil</h3>
                  <div className="space-y-2">
                    {ROLE_PERMISSIONS[selectedUser.role as UserRole]?.map((permission) => (
                      <div key={permission} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{permission}</span>
                        <Switch checked={true} disabled />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setSelectedUser(null)} variant="outline" className="w-full">
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
