// Serviço de Permissões Granular
import { createClient } from "@/lib/supabase/client"

export interface Permission {
  id: string
  module: string
  action: string
  description: string
}

export interface RolePermission {
  role_id: string
  permission_id: string
  granted: boolean
}

export interface UserPermission {
  user_id: string
  permission_id: string
  granted: boolean
}

export class PermissionsService {
  private supabase = createClient()
  private permissionsCache: Map<string, Permission[]> = new Map()

  // Permissões disponíveis no sistema
  private defaultPermissions: Permission[] = [
    // Pedidos
    { id: 'orders.view', module: 'orders', action: 'view', description: 'Visualizar pedidos' },
    { id: 'orders.create', module: 'orders', action: 'create', description: 'Criar pedidos' },
    { id: 'orders.edit', module: 'orders', action: 'edit', description: 'Editar pedidos' },
    { id: 'orders.delete', module: 'orders', action: 'delete', description: 'Excluir pedidos' },
    { id: 'orders.approve', module: 'orders', action: 'approve', description: 'Aprovar pedidos' },
    
    // Clientes
    { id: 'clients.view', module: 'clients', action: 'view', description: 'Visualizar clientes' },
    { id: 'clients.create', module: 'clients', action: 'create', description: 'Criar clientes' },
    { id: 'clients.edit', module: 'clients', action: 'edit', description: 'Editar clientes' },
    { id: 'clients.delete', module: 'clients', action: 'delete', description: 'Excluir clientes' },
    
    // Designers
    { id: 'designers.view', module: 'designers', action: 'view', description: 'Visualizar designers' },
    { id: 'designers.create', module: 'designers', action: 'create', description: 'Criar designers' },
    { id: 'designers.edit', module: 'designers', action: 'edit', description: 'Editar designers' },
    { id: 'designers.delete', module: 'designers', action: 'delete', description: 'Excluir designers' },
    { id: 'designers.approve', module: 'designers', action: 'approve', description: 'Aprovar designers' },
    
    // Financeiro
    { id: 'finance.view', module: 'finance', action: 'view', description: 'Visualizar financeiro' },
    { id: 'finance.create', module: 'finance', action: 'create', description: 'Criar registros financeiros' },
    { id: 'finance.edit', module: 'finance', action: 'edit', description: 'Editar registros financeiros' },
    { id: 'finance.delete', module: 'finance', action: 'delete', description: 'Excluir registros financeiros' },
    { id: 'finance.reports', module: 'finance', action: 'reports', description: 'Acessar relatórios financeiros' },
    
    // Estoque
    { id: 'inventory.view', module: 'inventory', action: 'view', description: 'Visualizar estoque' },
    { id: 'inventory.create', module: 'inventory', action: 'create', description: 'Criar registros de estoque' },
    { id: 'inventory.edit', module: 'inventory', action: 'edit', description: 'Editar registros de estoque' },
    { id: 'inventory.delete', module: 'inventory', action: 'delete', description: 'Excluir registros de estoque' },
    
    // Impressoras
    { id: 'printers.view', module: 'printers', action: 'view', description: 'Visualizar impressoras' },
    { id: 'printers.create', module: 'printers', action: 'create', description: 'Criar impressoras' },
    { id: 'printers.edit', module: 'printers', action: 'edit', description: 'Editar impressoras' },
    { id: 'printers.delete', module: 'printers', action: 'delete', description: 'Excluir impressoras' },
    { id: 'printers.maintenance', module: 'printers', action: 'maintenance', description: 'Gerenciar manutenções' },
    
    // Relatórios
    { id: 'reports.view', module: 'reports', action: 'view', description: 'Visualizar relatórios' },
    { id: 'reports.export', module: 'reports', action: 'export', description: 'Exportar relatórios' },
    
    // Configurações
    { id: 'settings.view', module: 'settings', action: 'view', description: 'Visualizar configurações' },
    { id: 'settings.edit', module: 'settings', action: 'edit', description: 'Editar configurações' },
    
    // Usuários
    { id: 'users.view', module: 'users', action: 'view', description: 'Visualizar usuários' },
    { id: 'users.create', module: 'users', action: 'create', description: 'Criar usuários' },
    { id: 'users.edit', module: 'users', action: 'edit', description: 'Editar usuários' },
    { id: 'users.delete', module: 'users', action: 'delete', description: 'Excluir usuários' },
    
    // Cores
    { id: 'colors.view', module: 'colors', action: 'view', description: 'Visualizar sistema de cores' },
    { id: 'colors.manage', module: 'colors', action: 'manage', description: 'Gerenciar sistema de cores' },
    { id: 'colors.analyze', module: 'colors', action: 'analyze', description: 'Analisar cores' },
  ]

  // Obter todas as permissões
  getAllPermissions(): Permission[] {
    return this.defaultPermissions
  }

  // Obter permissões por módulo
  getPermissionsByModule(module: string): Permission[] {
    return this.defaultPermissions.filter(p => p.module === module)
  }

  // Verificar se usuário tem permissão específica
  async hasPermission(userId: string, permissionId: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user || user.id !== userId) return false

    // Admin tem todas as permissões
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin') return true

    // Verificar permissão específica do usuário
    const { data: userPermission } = await this.supabase
      .from('user_permissions')
      .select('granted')
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
      .single()

    if (userPermission?.granted) return true

    // Verificar permissão do role do usuário
    const { data: rolePermission } = await this.supabase
      .from('role_permissions')
      .select('granted')
      .eq('role_id', profile?.role)
      .eq('permission_id', permissionId)
      .single()

    return rolePermission?.granted || false
  }

  // Verificar se usuário tem permissão para uma ação em um módulo
  async canPerformAction(userId: string, module: string, action: string): Promise<boolean> {
    const permissionId = `${module}.${action}`
    return this.hasPermission(userId, permissionId)
  }

  // Obter permissões do usuário
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user || user.id !== userId) return []

    // Admin tem todas as permissões
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin') return this.defaultPermissions

    const userPermissions = new Set<string>()

    // Buscar permissões diretas do usuário
    const { data: directPermissions } = await this.supabase
      .from('user_permissions')
      .select('permission_id')
      .eq('user_id', userId)
      .eq('granted', true)

    directPermissions?.forEach(p => userPermissions.add(p.permission_id))

    // Buscar permissões do role
    const { data: rolePermissions } = await this.supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', profile?.role)
      .eq('granted', true)

    rolePermissions?.forEach(p => userPermissions.add(p.permission_id))

    return this.defaultPermissions.filter(p => userPermissions.has(p.id))
  }

  // Conceder permissão a usuário
  async grantPermissionToUser(userId: string, permissionId: string): Promise<void> {
    await this.supabase
      .from('user_permissions')
      .upsert({ user_id: userId, permission_id: permissionId, granted: true })
  }

  // Revogar permissão de usuário
  async revokePermissionFromUser(userId: string, permissionId: string): Promise<void> {
    await this.supabase
      .from('user_permissions')
      .update({ granted: false })
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
  }

  // Conceder permissão a role
  async grantPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await this.supabase
      .from('role_permissions')
      .upsert({ role_id: roleId, permission_id: permissionId, granted: true })
  }

  // Revogar permissão de role
  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.supabase
      .from('role_permissions')
      .update({ granted: false })
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)
  }

  // Hook React para verificar permissões
  createPermissionHook(userId: string) {
    return {
      hasPermission: (permissionId: string) => this.hasPermission(userId, permissionId),
      canPerformAction: (module: string, action: string) => this.canPerformAction(userId, module, action),
      getPermissions: () => this.getUserPermissions(userId)
    }
  }
}

export const permissionsService = new PermissionsService()
