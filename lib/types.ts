export type UserRole = 'admin' | 'designer' | 'client'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrderStatus = 'briefing' | 'design' | 'aprovacao' | 'producao' | 'finalizado'
export type OrderPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export type SportType =
  | 'futebol'
  | 'futsal'
  | 'basquete'
  | 'volei'
  | 'handebol'
  | 'corrida'
  | 'ciclismo'

export const SPORT_LABELS: Record<SportType, string> = {
  futebol: 'Futebol',
  futsal: 'Futsal',
  basquete: 'Basquete',
  volei: 'Vôlei',
  handebol: 'Handebol',
  corrida: 'Corrida',
  ciclismo: 'Ciclismo',
}

export interface OrderItem {
  id: string
  order_id: string
  import_batch_id: string | null
  player_name: string | null
  player_number: string | null
  size: string | null
  position: string | null
  category: string | null
  team_name: string | null
  sector: string | null
  role: string | null
  sponsor: string | null
  quantity: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type ImportSourceType = 'excel' | 'csv' | 'paste'
export type ImportTarget = 'order_items' | 'orders' | 'clients'
export type ImportStatus = 'completed' | 'rolled_back' | 'partial'

export interface ImportError {
  row: number
  field?: string
  message: string
}

export interface ImportBatch {
  id: string
  order_id: string | null
  imported_by: string | null
  source_type: ImportSourceType
  file_name: string | null
  target: ImportTarget
  total_rows: number
  success_count: number
  error_count: number
  status: ImportStatus
  errors: ImportError[]
  column_mapping: Record<string, string>
  created_at: string
}

// Campos que o importador sabe mapear para order_items
export const IMPORT_FIELDS = [
  { key: 'player_name', label: 'Nome', aliases: ['nome', 'name', 'jogador', 'atleta', 'cliente'] },
  { key: 'player_number', label: 'Número', aliases: ['numero', 'número', 'number', 'num', 'n'] },
  { key: 'size', label: 'Tamanho', aliases: ['tamanho', 'size', 'tam'] },
  { key: 'position', label: 'Posição', aliases: ['posicao', 'posição', 'position', 'pos'] },
  { key: 'category', label: 'Categoria', aliases: ['categoria', 'category', 'cat'] },
  { key: 'team_name', label: 'Equipe', aliases: ['equipe', 'time', 'team', 'clube'] },
  { key: 'sector', label: 'Setor', aliases: ['setor', 'sector', 'departamento'] },
  { key: 'role', label: 'Cargo', aliases: ['cargo', 'role', 'funcao', 'função'] },
  { key: 'sponsor', label: 'Patrocinador', aliases: ['patrocinador', 'sponsor', 'patrocinio'] },
  { key: 'quantity', label: 'Quantidade', aliases: ['quantidade', 'quantity', 'qtd', 'qty'] },
  { key: 'notes', label: 'Observações', aliases: ['observacoes', 'observações', 'obs', 'notes', 'notas'] },
] as const

export type ImportFieldKey = typeof IMPORT_FIELDS[number]['key']

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
  sport_type: SportType | null
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
