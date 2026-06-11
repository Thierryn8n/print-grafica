export type UserRole = 'admin' | 'designer' | 'client'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrderStatus =
  | 'novo-pedido'
  | 'aguardando-info'
  | 'em-criacao'
  | 'revisao-interna'
  | 'mockup-pronto'
  | 'enviado-aprovacao'
  | 'aprovado'
  | 'ajustes-solicitados'
  | 'arte-finalizada'
  | 'enviado-producao'
  | 'sublimacao'
  | 'finalizado'
  | 'entregue'
export type OrderPriority = 'baixa' | 'media' | 'alta' | 'urgente'

/** Ordem oficial do fluxo de produção (usada nas colunas do Kanban) */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'novo-pedido',
  'aguardando-info',
  'em-criacao',
  'mockup-pronto',
  'enviado-aprovacao',
  'aprovado',
  'enviado-producao',
  'sublimacao',
  'finalizado',
  'entregue',
]

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  whatsapp: string | null
  address: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  client_id: string | null
  client_name: string
  client_phone: string | null
  product_type: string
  quantity: number
  description: string | null
  specifications: Record<string, unknown>
  status: OrderStatus
  priority: OrderPriority
  deadline: string | null
  total_value: number | null
  designer_id: string | null
  approval_token: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  designer?: Profile
  client?: Client
  files?: OrderFile[]
}

export interface OrderFile {
  id: string
  order_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number | null
  version: number
  uploaded_by: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  order_id: string | null
  user_id: string | null
  action: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

export interface SystemSettings {
  id: string
  key: string
  value: unknown
  updated_at: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  'novo-pedido': 'Orçamento',
  'aguardando-info': 'Arte Pendente',
  'em-criacao': 'Em Criação',
  'revisao-interna': 'Revisão Interna',
  'mockup-pronto': 'Exportação',
  'enviado-aprovacao': 'Aguardando Aprovação',
  'aprovado': 'Aprovado',
  'ajustes-solicitados': 'Ajustes Solicitados',
  'arte-finalizada': 'Arte Finalizada',
  'enviado-producao': 'Em Produção',
  'sublimacao': 'Sublimação',
  'finalizado': 'Finalizado',
  'entregue': 'Entregue',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  'novo-pedido': 'bg-slate-500',
  'aguardando-info': 'bg-amber-500',
  'em-criacao': 'bg-blue-500',
  'revisao-interna': 'bg-sky-500',
  'mockup-pronto': 'bg-cyan-500',
  'enviado-aprovacao': 'bg-orange-500',
  'aprovado': 'bg-emerald-500',
  'ajustes-solicitados': 'bg-rose-500',
  'arte-finalizada': 'bg-lime-600',
  'enviado-producao': 'bg-indigo-500',
  'sublimacao': 'bg-pink-500',
  'finalizado': 'bg-green-600',
  'entregue': 'bg-teal-600',
}

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente'
}

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  baixa: 'bg-gray-500',
  media: 'bg-blue-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500'
}

export const PRODUCT_TYPES = [
  'Camiseta',
  'Caneca',
  'Squeeze',
  'Chinelo',
  'Azulejo',
  'Porta-Copo',
  'Mouse Pad',
  'Almofada',
  'Ecobag',
  'Avental',
  'Boné',
  'Outro'
]
