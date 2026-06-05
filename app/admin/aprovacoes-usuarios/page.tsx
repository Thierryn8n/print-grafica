"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { 
  UserCheck, 
  UserX, 
  Shield, 
  Palette, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Phone,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AprovacoesUsuariosPage() {
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([])
  const [rejectedUsers, setRejectedUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminCount, setAdminCount] = useState(0)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: "approve" | "reject"
    user: Profile | null
  }>({ open: false, type: "approve", user: null })

  const maxAdmins = 2

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const supabase = createClient()

    // Get all users grouped by status
    const { data: pending } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    const { data: approved } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    const { data: rejected } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "rejected")
      .order("created_at", { ascending: false })

    // Count approved admins
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved")

    setPendingUsers(pending || [])
    setApprovedUsers(approved || [])
    setRejectedUsers(rejected || [])
    setAdminCount(count || 0)
    setLoading(false)
  }

  async function handleApprove(user: Profile) {
    // Check admin limit
    if (user.role === "admin" && adminCount >= maxAdmins) {
      alert("Limite de administradores atingido!")
      return
    }

    setActionLoading(user.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (!error) {
      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Conta Aprovada!",
        message: "Sua conta foi aprovada. Você já pode acessar o sistema.",
        type: "success",
        link: user.role === "admin" ? "/admin" : "/designer"
      })

      await loadUsers()
    }

    setActionLoading(null)
    setConfirmDialog({ open: false, type: "approve", user: null })
  }

  async function handleReject(user: Profile) {
    setActionLoading(user.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (!error) {
      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Conta Rejeitada",
        message: "Infelizmente sua solicitação de acesso foi rejeitada.",
        type: "error"
      })

      await loadUsers()
    }

    setActionLoading(null)
    setConfirmDialog({ open: false, type: "reject", user: null })
  }

  function UserCard({ user, showActions = false }: { user: Profile; showActions?: boolean }) {
    const isAdmin = user.role === "admin"
    const canApproveAdmin = isAdmin ? adminCount < maxAdmins : true

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? "bg-primary/10" : "bg-blue-500/10"}`}>
              {isAdmin ? (
                <Shield className="w-6 h-6 text-primary" />
              ) : (
                <Palette className="w-6 h-6 text-blue-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">
                  {user.full_name}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"}`}>
                  {isAdmin ? "Admin" : "Designer"}
                </span>
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
                {user.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    {user.phone}
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {showActions && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-9"
                    disabled={actionLoading === user.id || !canApproveAdmin}
                    onClick={() => setConfirmDialog({ open: true, type: "approve", user })}
                  >
                    {actionLoading === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Aprovar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 h-9"
                    disabled={actionLoading === user.id}
                    onClick={() => setConfirmDialog({ open: true, type: "reject", user })}
                  >
                    {actionLoading === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Rejeitar
                      </>
                    )}
                  </Button>
                </div>
              )}

              {showActions && isAdmin && !canApproveAdmin && (
                <p className="text-xs text-destructive mt-2">
                  Limite de {maxAdmins} administradores atingido
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Aprovação de Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as solicitações de acesso ao sistema
        </p>
      </div>

      {/* Admin limit info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Administradores</span>
            </div>
            <span className={`text-sm font-bold ${adminCount >= maxAdmins ? "text-destructive" : "text-foreground"}`}>
              {adminCount}/{maxAdmins}
            </span>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${adminCount >= maxAdmins ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${(adminCount / maxAdmins) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="pending" className="relative">
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Pendentes</span>
            {pendingUsers.length > 0 && (
              <span className="ml-1.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Aprovados</span>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Rejeitados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário aguardando aprovação</p>
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map((user) => (
              <UserCard key={user.id} user={user} showActions />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário aprovado</p>
              </CardContent>
            </Card>
          ) : (
            approvedUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejectedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário rejeitado</p>
              </CardContent>
            </Card>
          ) : (
            rejectedUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === "approve" ? "Aprovar Usuário" : "Rejeitar Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === "approve" 
                ? `Tem certeza que deseja aprovar ${confirmDialog.user?.full_name}? Ele terá acesso ao sistema como ${confirmDialog.user?.role === "admin" ? "Administrador" : "Designer"}.`
                : `Tem certeza que deseja rejeitar ${confirmDialog.user?.full_name}? Ele não poderá acessar o sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={`w-full sm:w-auto ${confirmDialog.type === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`}
              onClick={() => {
                if (confirmDialog.user) {
                  if (confirmDialog.type === "approve") {
                    handleApprove(confirmDialog.user)
                  } else {
                    handleReject(confirmDialog.user)
                  }
                }
              }}
            >
              {confirmDialog.type === "approve" ? "Aprovar" : "Rejeitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
