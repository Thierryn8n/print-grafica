'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
export type ProductionStage = 'design1' | 'design2' | 'costura' | 'concluido'
export type ServiceType = 'camisa-time' | 'camisa-promocional' | 'abada' | 'uniforme' | 'colete' | 'bandeira' | 'banner' | 'arte-avulsa' | 'mockup' | 'outro'
export type ModelType = 'manga-curta' | 'manga-longa' | 'gola-careca' | 'gola-alta' | 'gola-polo' | 'regata' | 'short' | 'conjunto'

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

export interface SizeGrid {
  PP: number
  P: number
  M: number
  G: number
  GG: number
  XG: number
  XGG: number
  infantil: number
  outros: string
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userRole: 'admin' | 'designer'
  content: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  action: string
  userId: string
  userName: string
  createdAt: string
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  url: string
  uploadedBy: string
  uploadedAt: string
  version?: number
}

export interface Player {
  id: string
  number: string
  name: string
  size?: string
}

export interface Checklist {
  logoConferida: boolean
  nomeConferido: boolean
  numeroConferido: boolean
  coresConferidas: boolean
  tamanhosConferidos: boolean
  mockupFrenteConferido: boolean
  mockupCostasConferido: boolean
  arquivoAltaQualidade: boolean
  arquivoProntoImpressao: boolean
  clienteAprovou: boolean
}

export interface StageHistoryEntry {
  from: ProductionStage
  to: ProductionStage
  by: string
  byName: string
  at: string
}

export interface Order {
  id: string
  clientName: string
  teamName: string
  phone: string
  deadline: string
  priority: Priority
  serviceType: ServiceType
  totalQuantity: number
  sizeGrid: SizeGrid
  model: ModelType
  observations: string
  colors: string
  designerId: string | null
  status: OrderStatus
  productionStage: ProductionStage
  stageHistory: StageHistoryEntry[]
  sentToCosturaAt?: string | null
  createdAt: string
  updatedAt: string
  approvalLink?: string
  approvedAt?: string
  approvedBy?: string
  clientObservations?: string
  comments: Comment[]
  history: HistoryEntry[]
  files: FileAttachment[]
  checklist: Checklist
  artDimensions?: string
  colorMode?: 'RGB' | 'CMYK' | 'pronto-impressao'
  hasNumbering?: boolean
  players?: Player[]
  fabricId?: string | null
  fabricName?: string
  basePrice?: number
  modelPrice?: number
  unitPrice?: number
  totalPrice?: number
  downPaymentPercent?: number
  downPayment?: number
  trackingToken?: string
}

export interface Designer {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface Notification {
  id: string
  type: 'nova-tarefa' | 'tarefa-atribuida' | 'cliente-aprovou' | 'ajuste-solicitado' | 'prazo-proximo' | 'pedido-atrasado' | 'arquivo-enviado'
  title: string
  message: string
  orderId?: string
  read: boolean
  createdAt: string
}

type CurrentUser = { id: string; name: string; role: 'admin' | 'designer' } | null

interface AppState {
  orders: Order[]
  designers: Designer[]
  notifications: Notification[]
  currentUser: CurrentUser
  hydrated: boolean
  loading: boolean

  // Hydration
  hydrate: () => Promise<void>

  // Order actions
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history' | 'checklist'>) => Promise<void>
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  moveOrder: (id: string, newStatus: OrderStatus) => Promise<void>
  passOrderTo: (id: string, toStage: ProductionStage, targetDesignerId?: string | null) => Promise<void>

  // Comment actions
  addComment: (orderId: string, content: string) => Promise<void>

  // File actions
  addFile: (orderId: string, file: Omit<FileAttachment, 'id' | 'uploadedAt'>) => Promise<void>

  // Checklist actions
  updateChecklist: (orderId: string, updates: Partial<Checklist>) => Promise<void>

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  // Auth
  setCurrentUser: (user: CurrentUser) => void
}

const defaultSizeGrid: SizeGrid = { PP: 0, P: 0, M: 0, G: 0, GG: 0, XG: 0, XGG: 0, infantil: 0, outros: '' }

const defaultChecklist: Checklist = {
  logoConferida: false,
  nomeConferido: false,
  numeroConferido: false,
  coresConferidas: false,
  tamanhosConferidos: false,
  mockupFrenteConferido: false,
  mockupCostasConferido: false,
  arquivoAltaQualidade: false,
  arquivoProntoImpressao: false,
  clienteAprovou: false,
}

// ---------- Mappers between DB rows and the rich Order shape ----------

function rowToOrder(row: any): Order {
  const meta = row.metadata || {}
  const colors = Array.isArray(row.colors)
    ? row.colors.join(', ')
    : typeof row.colors === 'string'
      ? row.colors
      : meta.colors || ''

  return {
    id: row.id,
    clientName: row.client_name || '',
    teamName: row.title || '',
    phone: row.client_phone || '',
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : '',
    priority: (row.priority || 'normal') as Priority,
    serviceType: (row.product_type || 'outro') as ServiceType,
    totalQuantity: row.quantity || 0,
    sizeGrid: { ...defaultSizeGrid, ...(row.size_breakdown || {}) },
    model: (meta.model || 'manga-curta') as ModelType,
    observations: row.description || meta.observations || '',
    colors,
    designerId: row.designer_id || null,
    status: (row.status || 'novo-pedido') as OrderStatus,
    productionStage: (row.production_stage || 'design1') as ProductionStage,
    stageHistory: (row.stage_history || []) as StageHistoryEntry[],
    sentToCosturaAt: row.sent_to_costura_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    approvalLink: meta.approvalLink || (row.approval_token ? `/aprovacao/${row.id}` : undefined),
    trackingToken: row.tracking_token || undefined,
    approvedAt: row.approved_at || meta.approvedAt,
    approvedBy: meta.approvedBy,
    clientObservations: meta.clientObservations,
    comments: meta.comments || [],
    history: meta.history || [],
    files: meta.files || [],
    checklist: { ...defaultChecklist, ...(meta.checklist || {}) },
    artDimensions: meta.artDimensions,
    colorMode: meta.colorMode,
    hasNumbering: meta.hasNumbering ?? false,
    players: meta.players || [],
    fabricId: meta.fabricId ?? null,
    fabricName: meta.fabricName,
    basePrice: meta.basePrice ?? 0,
    modelPrice: meta.modelPrice ?? 0,
    unitPrice: meta.unitPrice ?? 0,
    totalPrice: meta.totalPrice ?? 0,
  }
}

function orderToRow(order: Partial<Order>) {
  const row: Record<string, any> = {}
  if (order.clientName !== undefined) row.client_name = order.clientName
  if (order.teamName !== undefined) row.title = order.teamName
  if (order.phone !== undefined) row.client_phone = order.phone
  if (order.deadline !== undefined) row.deadline = order.deadline || null
  if (order.priority !== undefined) row.priority = order.priority
  if (order.serviceType !== undefined) row.product_type = order.serviceType
  if (order.totalQuantity !== undefined) row.quantity = order.totalQuantity
  if (order.sizeGrid !== undefined) row.size_breakdown = order.sizeGrid
  if (order.colors !== undefined) {
    row.colors = order.colors
      ? order.colors.split(',').map((c) => c.trim()).filter(Boolean)
      : []
  }
  if (order.observations !== undefined) row.description = order.observations
  if (order.designerId !== undefined) row.designer_id = order.designerId
  if (order.status !== undefined) row.status = order.status
  if (order.productionStage !== undefined) row.production_stage = order.productionStage
  if (order.stageHistory !== undefined) row.stage_history = order.stageHistory
  if (order.sentToCosturaAt !== undefined) row.sent_to_costura_at = order.sentToCosturaAt || null
  if (order.approvedAt !== undefined) row.approved_at = order.approvedAt || null

  // Valores de pagamento (colunas reais da tabela orders)
  if (order.totalPrice !== undefined) row.total_value = order.totalPrice
  if (order.downPaymentPercent !== undefined) row.down_payment_percent = order.downPaymentPercent
  if (order.downPayment !== undefined) {
    row.paid_value = 0 // entrada ainda não recebida no momento da criação
    row.payment_status = 'pendente'
  }

  // Rich, store-specific fields live in metadata
  const metaKeys: (keyof Order)[] = [
    'model', 'observations', 'comments', 'history', 'files', 'checklist',
    'approvalLink', 'approvedBy', 'clientObservations', 'artDimensions', 'colorMode',
    'hasNumbering', 'players',
    'fabricId', 'fabricName', 'basePrice', 'modelPrice', 'unitPrice', 'totalPrice',
  ]
  const meta: Record<string, any> = {}
  let hasMeta = false
  for (const k of metaKeys) {
    if (order[k] !== undefined) {
      meta[k] = order[k]
      hasMeta = true
    }
  }
  if (hasMeta) row.__meta = meta
  return row
}

export const useAppStore = create<AppState>()((set, get) => ({
  orders: [],
  designers: [],
  notifications: [],
  currentUser: null,
  hydrated: false,
  loading: false,

  hydrate: async () => {
    if (get().loading) return
    set({ loading: true })
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      let currentUser: CurrentUser = null
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', user.id)
          .single()
        if (profile) {
          currentUser = {
            id: profile.id,
            name: profile.full_name || user.email || 'Usuário',
            role: profile.role === 'admin' ? 'admin' : 'designer',
          }
        }
      }

      const [{ data: orderRows }, { data: designerRows }, notifRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, avatar_url').in('role', ['designer', 'admin']).eq('status', 'approved'),
        user
          ? supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ])

      const orders = (orderRows || []).map(rowToOrder)
      const designers: Designer[] = (designerRows || []).map((d: any) => ({
        id: d.id,
        name: d.full_name || d.email || 'Designer',
        email: d.email || '',
        avatar: d.avatar_url || '',
      }))
      const notifications: Notification[] = (notifRes.data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        orderId: n.link || undefined,
        read: n.read,
        createdAt: n.created_at,
      }))

      set({ orders, designers, notifications, currentUser, hydrated: true, loading: false })
    } catch (err) {
      console.log('[v0] store.hydrate error:', err)
      set({ hydrated: true, loading: false })
    }
  },

  addOrder: async (orderData) => {
    const supabase = createClient()
    const user = get().currentUser
    const row = orderToRow(orderData as Partial<Order>)
    const meta = row.__meta || {}
    delete row.__meta

    const history: HistoryEntry[] = [{
      id: `h${Date.now()}`,
      action: 'Pedido criado',
      userId: user?.id || 'unknown',
      userName: user?.name || 'Desconhecido',
      createdAt: new Date().toISOString(),
    }]

    const orderNumber = `PED-${Date.now().toString().slice(-6)}`
    const insertRow = {
      ...row,
      order_number: orderNumber,
      status: orderData.status || 'novo-pedido',
      created_by: user?.id || null,
      metadata: { ...meta, comments: [], history, checklist: defaultChecklist, files: orderData.files || [] },
    }

    const { data, error } = await supabase.from('orders').insert(insertRow).select('*').single()
    if (error) {
      console.log('[v0] addOrder error:', error.message)
      return
    }
    const newOrder = rowToOrder(data)
    set((state) => ({ orders: [newOrder, ...state.orders] }))

    await get().addNotification({
      type: 'nova-tarefa',
      title: 'Novo pedido criado',
      message: `${orderData.clientName} - ${orderData.serviceType}`,
      orderId: newOrder.id,
    })
  },

  updateOrder: async (id, updates) => {
    const supabase = createClient()
    const user = get().currentUser
    const existing = get().orders.find((o) => o.id === id)
    if (!existing) return

    const newHistory: HistoryEntry[] = [
      ...existing.history,
      {
        id: `h${Date.now()}`,
        action: 'Pedido atualizado',
        userId: user?.id || 'unknown',
        userName: user?.name || 'Desconhecido',
        createdAt: new Date().toISOString(),
      },
    ]

    const merged: Order = { ...existing, ...updates, history: newHistory, updatedAt: new Date().toISOString() }
    set((state) => ({ orders: state.orders.map((o) => (o.id === id ? merged : o)) }))

    const row = orderToRow(merged)
    delete row.__meta
    const { error } = await supabase.from('orders').update({ ...row, metadata: rowMeta(merged) }).eq('id', id)
    if (error) console.log('[v0] updateOrder error:', error.message)
  },

  deleteOrder: async (id) => {
    const supabase = createClient()
    set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }))
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) console.log('[v0] deleteOrder error:', error.message)
  },

  moveOrder: async (id, newStatus) => {
    const supabase = createClient()
    const user = get().currentUser
    const existing = get().orders.find((o) => o.id === id)
    if (!existing) return

    const newHistory: HistoryEntry[] = [
      ...existing.history,
      {
        id: `h${Date.now()}`,
        action: `Status alterado para "${getStatusLabel(newStatus)}"`,
        userId: user?.id || 'unknown',
        userName: user?.name || 'Desconhecido',
        createdAt: new Date().toISOString(),
      },
    ]
    const merged: Order = { ...existing, status: newStatus, history: newHistory, updatedAt: new Date().toISOString() }
    set((state) => ({ orders: state.orders.map((o) => (o.id === id ? merged : o)) }))

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, metadata: rowMeta(merged) })
      .eq('id', id)
    if (error) console.log('[v0] moveOrder error:', error.message)
  },

  passOrderTo: async (id, toStage, targetDesignerId) => {
    const supabase = createClient()
    const user = get().currentUser
    const existing = get().orders.find((o) => o.id === id)
    if (!existing) return

    const fromStage = existing.productionStage || 'design1'
    const now = new Date().toISOString()

    const stageEntry: StageHistoryEntry = {
      from: fromStage,
      to: toStage,
      by: user?.id || 'unknown',
      byName: user?.name || 'Desconhecido',
      at: now,
    }

    const newStageHistory = [...(existing.stageHistory || []), stageEntry]
    const newHistory: HistoryEntry[] = [
      ...existing.history,
      {
        id: `h${Date.now()}`,
        action: `Repassado para ${getStageLabel(toStage)}`,
        userId: user?.id || 'unknown',
        userName: user?.name || 'Desconhecido',
        createdAt: now,
      },
    ]

    const merged: Order = {
      ...existing,
      productionStage: toStage,
      stageHistory: newStageHistory,
      sentToCosturaAt: toStage === 'costura' ? now : existing.sentToCosturaAt,
      designerId: targetDesignerId !== undefined ? targetDesignerId : existing.designerId,
      history: newHistory,
      updatedAt: now,
    }
    set((state) => ({ orders: state.orders.map((o) => (o.id === id ? merged : o)) }))

    const updateRow: Record<string, any> = {
      production_stage: toStage,
      stage_history: newStageHistory,
      metadata: rowMeta(merged),
    }
    if (toStage === 'costura') updateRow.sent_to_costura_at = now
    if (targetDesignerId !== undefined) updateRow.designer_id = targetDesignerId

    const { error } = await supabase.from('orders').update(updateRow).eq('id', id)
    if (error) console.log('[v0] passOrderTo error:', error.message)

    await get().addNotification({
      type: 'tarefa-atribuida',
      title: `Pedido repassado para ${getStageLabel(toStage)}`,
      message: `${existing.clientName} - ${existing.teamName}`,
      orderId: id,
    })
  },

  addComment: async (orderId, content) => {
    const supabase = createClient()
    const user = get().currentUser
    if (!user) return
    const existing = get().orders.find((o) => o.id === orderId)
    if (!existing) return

    const newComment: Comment = {
      id: `c${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      content,
      createdAt: new Date().toISOString(),
    }
    const merged: Order = { ...existing, comments: [...existing.comments, newComment] }
    set((state) => ({ orders: state.orders.map((o) => (o.id === orderId ? merged : o)) }))

    const { error } = await supabase.from('orders').update({ metadata: rowMeta(merged) }).eq('id', orderId)
    if (error) console.log('[v0] addComment error:', error.message)
  },

  addFile: async (orderId, file) => {
    const supabase = createClient()
    const existing = get().orders.find((o) => o.id === orderId)
    if (!existing) return

    const newFile: FileAttachment = { ...file, id: `f${Date.now()}`, uploadedAt: new Date().toISOString() }
    const merged: Order = { ...existing, files: [...existing.files, newFile] }
    set((state) => ({ orders: state.orders.map((o) => (o.id === orderId ? merged : o)) }))

    const { error } = await supabase.from('orders').update({ metadata: rowMeta(merged) }).eq('id', orderId)
    if (error) console.log('[v0] addFile error:', error.message)

    await get().addNotification({
      type: 'arquivo-enviado',
      title: 'Novo arquivo enviado',
      message: `${file.name} foi adicionado ao pedido`,
      orderId,
    })
  },

  updateChecklist: async (orderId, updates) => {
    const supabase = createClient()
    const existing = get().orders.find((o) => o.id === orderId)
    if (!existing) return

    const merged: Order = { ...existing, checklist: { ...existing.checklist, ...updates } }
    set((state) => ({ orders: state.orders.map((o) => (o.id === orderId ? merged : o)) }))

    const { error } = await supabase.from('orders').update({ metadata: rowMeta(merged) }).eq('id', orderId)
    if (error) console.log('[v0] updateChecklist error:', error.message)
  },

  addNotification: async (notification) => {
    const supabase = createClient()
    const user = get().currentUser
    const optimistic: Notification = {
      ...notification,
      id: `n${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    }
    set((state) => ({ notifications: [optimistic, ...state.notifications] }))

    if (!user) return
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.orderId || null,
        read: false,
      })
      .select('*')
      .single()
    if (error) {
      console.log('[v0] addNotification error:', error.message)
      return
    }
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === optimistic.id
          ? { ...n, id: data.id, createdAt: data.created_at }
          : n,
      ),
    }))
  },

  markNotificationRead: async (id) => {
    const supabase = createClient()
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) console.log('[v0] markNotificationRead error:', error.message)
  },

  markAllNotificationsRead: async () => {
    const supabase = createClient()
    const user = get().currentUser
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) }))
    if (!user) return
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    if (error) console.log('[v0] markAllNotificationsRead error:', error.message)
  },

  setCurrentUser: (user) => set({ currentUser: user }),
}))

// Helper to build the full metadata object for an order row
function rowMeta(order: Order) {
  return {
    model: order.model,
    observations: order.observations,
    comments: order.comments,
    history: order.history,
    files: order.files,
    checklist: order.checklist,
    approvalLink: order.approvalLink,
    approvedBy: order.approvedBy,
    clientObservations: order.clientObservations,
    artDimensions: order.artDimensions,
    colorMode: order.colorMode,
    hasNumbering: order.hasNumbering,
    players: order.players,
    fabricId: order.fabricId,
    fabricName: order.fabricName,
    basePrice: order.basePrice,
    modelPrice: order.modelPrice,
    unitPrice: order.unitPrice,
    totalPrice: order.totalPrice,
  }
}

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    'novo-pedido': 'Novo Pedido',
    'aguardando-info': 'Aguardando Informações',
    'em-criacao': 'Em Criação',
    'revisao-interna': 'Revisão Interna',
    'mockup-pronto': 'Mockup Pronto',
    'enviado-aprovacao': 'Enviado para Aprovação',
    'aprovado': 'Aprovado',
    'ajustes-solicitados': 'Ajustes Solicitados',
    'arte-finalizada': 'Arte Finalizada',
    'enviado-producao': 'Enviado para Produção',
    'sublimacao': 'Sublimação em Andamento',
    'finalizado': 'Finalizado',
    'entregue': 'Entregue'
  }
  return labels[status]
}

export function getServiceLabel(type: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    'camisa-time': 'Camisa de Time',
    'camisa-promocional': 'Camisa Promocional',
    'abada': 'Abadá',
    'uniforme': 'Uniforme',
    'colete': 'Colete',
    'bandeira': 'Bandeira',
    'banner': 'Banner',
    'arte-avulsa': 'Arte Avulsa',
    'mockup': 'Mockup',
    'outro': 'Outro'
  }
  return labels[type]
}

export function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    'baixa': 'Baixa',
    'normal': 'Normal',
    'alta': 'Alta',
    'urgente': 'Urgente'
  }
  return labels[priority]
}

export function getStageLabel(stage: ProductionStage): string {
  const labels: Record<ProductionStage, string> = {
    'design1': 'Designer 1',
    'design2': 'Designer 2',
    'costura': 'Costura',
    'concluido': 'Concluído',
  }
  return labels[stage]
}

export function getModelLabel(model: ModelType): string {
  const labels: Record<ModelType, string> = {
    'manga-curta': 'Manga Curta',
    'manga-longa': 'Manga Longa',
    'gola-careca': 'Gola Careca',
    'gola-alta': 'Gola Alta',
    'gola-polo': 'Gola Polo',
    'regata': 'Regata',
    'short': 'Short',
    'conjunto': 'Conjunto'
  }
  return labels[model]
}
