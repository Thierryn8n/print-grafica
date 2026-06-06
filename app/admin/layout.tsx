"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import { 
  LayoutDashboard, 
  Columns3, 
  FilePlus, 
  Users, 
  FolderOpen,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  Palette,
  Package,
  Wallet,
  Briefcase,
  Wand2,
  FileStack,
  Plug
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kanban", label: "Kanban", icon: Columns3 },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/novo-pedido", label: "Novo Pedido", icon: FilePlus },
  { href: "/admin/formularios", label: "Formulários", icon: UserCheck },
  { href: "/admin/aprovacoes-usuarios", label: "Aprovações", icon: UserCheck },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/crm", label: "CRM", icon: Briefcase },
  { href: "/admin/templates", label: "Templates", icon: Wand2 },
  { href: "/admin/pdf-massa", label: "PDF em Massa", icon: FileStack },
  { href: "/admin/integracoes", label: "Integrações & API", icon: Plug },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/designers", label: "Designers", icon: Palette },
  { href: "/admin/cores", label: "Cores Sublimadas", icon: Palette },
  { href: "/admin/tecidos", label: "Tecidos", icon: FolderOpen },
  { href: "/admin/tipos-camisa", label: "Tipos de Camisa", icon: Palette },
  { href: "/admin/tipos-short", label: "Tipos de Short", icon: FolderOpen },
  { href: "/admin/arquivos", label: "Arquivos", icon: FolderOpen },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login?panel=admin")
      return
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profileData || profileData.role !== "admin" || profileData.status !== "approved") {
      await supabase.auth.signOut()
      router.push("/auth/login?panel=admin")
      return
    }

    setProfile(profileData)

    // Get unread notifications count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)

    setUnreadNotifications(count || 0)
    setLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-14 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-foreground"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Image
          src="/images/logo.png"
          alt="GN Sublimais"
          width={100}
          height={32}
          className="h-7 w-auto"
        />
        <Link href="/admin/notificacoes" className="p-2 -mr-2 relative">
          <Bell className="w-6 h-6 text-foreground" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 lg:h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Image
            src="/images/logo.png"
            alt="GN Sublimais"
            width={120}
            height={40}
            className="h-8 w-auto brightness-0 invert"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrador</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {adminLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{link.label}</span>
                {link.href === "/admin/notificacoes" && unreadNotifications > 0 && (
                  <span className="ml-auto w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen pt-14 lg:pt-0">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
