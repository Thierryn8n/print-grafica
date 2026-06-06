export type UserRole = 'admin' | 'designer' | 'client'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrderStatus = 'briefing' | 'design' | 'aprovacao' | 'producao' | 'finalizado'
export type OrderPriority = 'baixa' | 'media' | 'alta' | 'urgente'

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
  team_name: string | null
  product_type: string
  model: string | null
  quantity: number
  size_pp: number
  size_p: number
  size_m: number
  size_g: number
  size_gg: number
  size_xg: number
  size_xgg: number
  size_infantil: number
  size_custom: string | null
  description: string | null
  colors: string | null
  logos_url: string | null
  reference_image_url: string | null
  ai_mockup_url: string | null
  specifications: Record<string, unknown>
  status: OrderStatus
  priority: OrderPriority
  deadline: string | null
  total_value: number | null
  cost_value: number | null
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
  briefing: 'Briefing',
  design: 'Em Design',
  aprovacao: 'Aguardando Aprovação',
  producao: 'Em Produção',
  finalizado: 'Finalizado'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  briefing: 'bg-blue-500',
  design: 'bg-yellow-500',
  aprovacao: 'bg-orange-500',
  producao: 'bg-purple-500',
  finalizado: 'bg-green-500'
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
