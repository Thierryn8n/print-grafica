import type { UserRole } from "@/lib/types"

// Define permissions for each role
export type Permission =
  | "view_dashboard"
  | "view_orders"
  | "create_orders"
  | "edit_orders"
  | "delete_orders"
  | "view_clients"
  | "create_clients"
  | "edit_clients"
  | "delete_clients"
  | "view_users"
  | "create_users"
  | "edit_users"
  | "delete_users"
  | "approve_users"
  | "view_financial"
  | "edit_financial"
  | "view_reports"
  | "view_templates"
  | "create_templates"
  | "edit_templates"
  | "delete_templates"
  | "view_assets"
  | "create_assets"
  | "edit_assets"
  | "delete_assets"
  | "view_crm"
  | "create_leads"
  | "edit_leads"
  | "delete_leads"
  | "view_production"
  | "manage_production"
  | "view_companies"
  | "create_companies"
  | "edit_companies"
  | "delete_companies"
  | "view_settings"
  | "edit_settings"

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // All permissions
    "view_dashboard",
    "view_orders",
    "create_orders",
    "edit_orders",
    "delete_orders",
    "view_clients",
    "create_clients",
    "edit_clients",
    "delete_clients",
    "view_users",
    "create_users",
    "edit_users",
    "delete_users",
    "approve_users",
    "view_financial",
    "edit_financial",
    "view_reports",
    "view_templates",
    "create_templates",
    "edit_templates",
    "delete_templates",
    "view_assets",
    "create_assets",
    "edit_assets",
    "delete_assets",
    "view_crm",
    "create_leads",
    "edit_leads",
    "delete_leads",
    "view_production",
    "manage_production",
    "view_companies",
    "create_companies",
    "edit_companies",
    "delete_companies",
    "view_settings",
    "edit_settings",
  ],
  designer: [
    "view_dashboard",
    "view_orders",
    "create_orders",
    "edit_orders",
    "view_clients",
    "create_clients",
    "edit_clients",
    "view_templates",
    "create_templates",
    "edit_templates",
    "view_assets",
    "create_assets",
    "edit_assets",
    "view_production",
  ],
  gerente: [
    "view_dashboard",
    "view_orders",
    "create_orders",
    "edit_orders",
    "view_clients",
    "create_clients",
    "edit_clients",
    "view_users",
    "edit_users",
    "view_financial",
    "view_reports",
    "view_templates",
    "view_assets",
    "view_crm",
    "create_leads",
    "edit_leads",
    "view_production",
    "manage_production",
    "view_companies",
    "view_settings",
  ],
  producao: [
    "view_dashboard",
    "view_orders",
    "edit_orders",
    "view_production",
    "manage_production",
    "view_assets",
    "view_templates",
  ],
  financeiro: [
    "view_dashboard",
    "view_orders",
    "view_clients",
    "view_financial",
    "edit_financial",
    "view_reports",
    "view_companies",
  ],
  vendedor: [
    "view_dashboard",
    "view_orders",
    "create_orders",
    "edit_orders",
    "view_clients",
    "create_clients",
    "edit_clients",
    "view_crm",
    "create_leads",
    "edit_leads",
    "delete_leads",
  ],
  cliente: [
    "view_orders",
    "view_assets",
  ],
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  designer: "Designer",
  gerente: "Gerente",
  producao: "Produção",
  financeiro: "Financeiro",
  vendedor: "Vendedor",
  cliente: "Cliente",
}

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acesso total ao sistema",
  designer: "Criação e edição de artes e templates",
  gerente: "Gestão de equipe, pedidos e produção",
  producao: "Gestão de fila de produção",
  financeiro: "Gestão financeira e relatórios",
  vendedor: "Gestão de clientes e CRM",
  cliente: "Visualização de pedidos e arquivos",
}
