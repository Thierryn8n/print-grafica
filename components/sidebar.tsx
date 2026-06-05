'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Kanban,
  PlusCircle,
  Users,
  UserCircle,
  CheckCircle,
  Factory,
  FolderOpen,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useState } from 'react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Kanban, label: 'Kanban', href: '/kanban' },
  { icon: PlusCircle, label: 'Novo Pedido', href: '/novo-pedido' },
  { icon: Users, label: 'Designers', href: '/designers' },
  { icon: UserCircle, label: 'Clientes', href: '/clientes' },
  { icon: CheckCircle, label: 'Aprovações', href: '/aprovacoes' },
  { icon: Factory, label: 'Produção', href: '/producao' },
  { icon: FolderOpen, label: 'Arquivos', href: '/arquivos' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { notifications, currentUser } = useAppStore()
  const unreadCount = notifications.filter(n => !n.read).length
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar text-sidebar-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
            <Image 
              src="/images/logo.png" 
              alt="GN Sublimais" 
              width={36} 
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">PrintFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Studio</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg glow-orange"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {item.href === '/aprovacoes' && unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs px-2 py-0">
                        {unreadCount}
                      </Badge>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Notifications & User */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <Link 
            href="/notificacoes"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <Bell className="h-5 w-5" />
            <span>Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-auto bg-primary text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </Link>
          
          <div className="flex items-center gap-3 px-4 py-3 bg-sidebar-accent rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold">
                {currentUser?.name.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.name || 'Usuário'}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser?.role || 'admin'}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
