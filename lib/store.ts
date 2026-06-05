import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Priority = 'baixa' | 'normal' | 'alta' | 'urgente'
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

interface AppState {
  orders: Order[]
  designers: Designer[]
  notifications: Notification[]
  currentUser: { id: string; name: string; role: 'admin' | 'designer' } | null
  
  // Order actions
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history' | 'checklist'>) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  deleteOrder: (id: string) => void
  moveOrder: (id: string, newStatus: OrderStatus) => void
  
  // Comment actions
  addComment: (orderId: string, content: string) => void
  
  // File actions
  addFile: (orderId: string, file: Omit<FileAttachment, 'id' | 'uploadedAt'>) => void
  
  // Checklist actions
  updateChecklist: (orderId: string, updates: Partial<Checklist>) => void
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  
  // Auth
  setCurrentUser: (user: { id: string; name: string; role: 'admin' | 'designer' } | null) => void
}

const initialDesigners: Designer[] = [
  { id: 'd1', name: 'Carlos Silva', email: 'carlos@gnsublimai.com', avatar: '' },
  { id: 'd2', name: 'Ana Oliveira', email: 'ana@gnsublimai.com', avatar: '' },
  { id: 'd3', name: 'Pedro Santos', email: 'pedro@gnsublimai.com', avatar: '' },
]

const initialOrders: Order[] = [
  {
    id: 'o1',
    clientName: 'Futebol Clube Estrela',
    teamName: 'Time Principal',
    phone: '(11) 99999-1234',
    deadline: '2026-06-05',
    priority: 'alta',
    serviceType: 'camisa-time',
    totalQuantity: 25,
    sizeGrid: { PP: 2, P: 5, M: 8, G: 6, GG: 3, XG: 1, XGG: 0, infantil: 0, outros: '' },
    model: 'manga-curta',
    observations: 'Números nas costas de 1 a 25. Nome do time na frente.',
    colors: 'Azul e branco',
    designerId: 'd1',
    status: 'em-criacao',
    createdAt: '2026-05-28T10:00:00Z',
    updatedAt: '2026-05-29T14:30:00Z',
    comments: [
      { id: 'c1', userId: 'admin', userName: 'Graziela', userRole: 'admin', content: 'Cliente pediu urgência!', createdAt: '2026-05-28T10:05:00Z' }
    ],
    history: [
      { id: 'h1', action: 'Pedido criado', userId: 'admin', userName: 'Graziela', createdAt: '2026-05-28T10:00:00Z' },
      { id: 'h2', action: 'Status alterado para "Em criação"', userId: 'd1', userName: 'Carlos Silva', createdAt: '2026-05-28T11:00:00Z' }
    ],
    files: [],
    checklist: {
      logoConferida: true,
      nomeConferido: true,
      numeroConferido: false,
      coresConferidas: true,
      tamanhosConferidos: true,
      mockupFrenteConferido: false,
      mockupCostasConferido: false,
      arquivoAltaQualidade: false,
      arquivoProntoImpressao: false,
      clienteAprovou: false
    }
  },
  {
    id: 'o2',
    clientName: 'Empresa ABC Ltda',
    teamName: 'Uniformes Corporativos',
    phone: '(11) 98888-5678',
    deadline: '2026-06-10',
    priority: 'normal',
    serviceType: 'uniforme',
    totalQuantity: 50,
    sizeGrid: { PP: 5, P: 10, M: 15, G: 12, GG: 5, XG: 2, XGG: 1, infantil: 0, outros: '' },
    model: 'gola-polo',
    observations: 'Logo no peito esquerdo. Nome do funcionário nas costas.',
    colors: 'Preto e laranja',
    designerId: 'd2',
    status: 'mockup-pronto',
    createdAt: '2026-05-25T09:00:00Z',
    updatedAt: '2026-05-30T16:00:00Z',
    comments: [],
    history: [
      { id: 'h3', action: 'Pedido criado', userId: 'admin', userName: 'Graziela', createdAt: '2026-05-25T09:00:00Z' }
    ],
    files: [],
    checklist: {
      logoConferida: true,
      nomeConferido: true,
      numeroConferido: true,
      coresConferidas: true,
      tamanhosConferidos: true,
      mockupFrenteConferido: true,
      mockupCostasConferido: true,
      arquivoAltaQualidade: false,
      arquivoProntoImpressao: false,
      clienteAprovou: false
    }
  },
  {
    id: 'o3',
    clientName: 'Banda Rock Nacional',
    teamName: 'Tour 2026',
    phone: '(21) 97777-4321',
    deadline: '2026-06-03',
    priority: 'urgente',
    serviceType: 'abada',
    totalQuantity: 200,
    sizeGrid: { PP: 20, P: 40, M: 60, G: 50, GG: 20, XG: 8, XGG: 2, infantil: 0, outros: '' },
    model: 'regata',
    observations: 'Arte da turnê com datas dos shows nas costas.',
    colors: 'Preto com detalhes em vermelho',
    designerId: 'd1',
    status: 'enviado-aprovacao',
    createdAt: '2026-05-20T14:00:00Z',
    updatedAt: '2026-05-31T10:00:00Z',
    approvalLink: 'https://printflow.studio/aprovacao/o3',
    comments: [],
    history: [],
    files: [],
    checklist: {
      logoConferida: true,
      nomeConferido: true,
      numeroConferido: true,
      coresConferidas: true,
      tamanhosConferidos: true,
      mockupFrenteConferido: true,
      mockupCostasConferido: true,
      arquivoAltaQualidade: true,
      arquivoProntoImpressao: false,
      clienteAprovou: false
    }
  },
  {
    id: 'o4',
    clientName: 'Escola Municipal',
    teamName: 'Festa Junina 2026',
    phone: '(11) 96666-8765',
    deadline: '2026-06-15',
    priority: 'baixa',
    serviceType: 'camisa-promocional',
    totalQuantity: 100,
    sizeGrid: { PP: 0, P: 10, M: 20, G: 20, GG: 10, XG: 5, XGG: 0, infantil: 35, outros: '' },
    model: 'manga-curta',
    observations: 'Tema junino com fogueira e bandeirinhas.',
    colors: 'Amarelo e vermelho',
    designerId: null,
    status: 'novo-pedido',
    createdAt: '2026-05-31T08:00:00Z',
    updatedAt: '2026-05-31T08:00:00Z',
    comments: [],
    history: [
      { id: 'h4', action: 'Pedido criado', userId: 'admin', userName: 'Graziela', createdAt: '2026-05-31T08:00:00Z' }
    ],
    files: [],
    checklist: {
      logoConferida: false,
      nomeConferido: false,
      numeroConferido: false,
      coresConferidas: false,
      tamanhosConferidos: false,
      mockupFrenteConferido: false,
      mockupCostasConferido: false,
      arquivoAltaQualidade: false,
      arquivoProntoImpressao: false,
      clienteAprovou: false
    }
  },
  {
    id: 'o5',
    clientName: 'Restaurante Sabor & Arte',
    teamName: 'Equipe de Garçons',
    phone: '(11) 95555-9876',
    deadline: '2026-06-08',
    priority: 'normal',
    serviceType: 'uniforme',
    totalQuantity: 15,
    sizeGrid: { PP: 1, P: 3, M: 5, G: 4, GG: 2, XG: 0, XGG: 0, infantil: 0, outros: '' },
    model: 'manga-longa',
    observations: 'Logo do restaurante no peito. Elegante e discreto.',
    colors: 'Branco e dourado',
    designerId: 'd3',
    status: 'aprovado',
    createdAt: '2026-05-22T11:00:00Z',
    updatedAt: '2026-05-30T09:00:00Z',
    approvedAt: '2026-05-30T09:00:00Z',
    approvedBy: 'João - Gerente',
    comments: [],
    history: [],
    files: [],
    checklist: {
      logoConferida: true,
      nomeConferido: true,
      numeroConferido: true,
      coresConferidas: true,
      tamanhosConferidos: true,
      mockupFrenteConferido: true,
      mockupCostasConferido: true,
      arquivoAltaQualidade: true,
      arquivoProntoImpressao: true,
      clienteAprovou: true
    }
  },
  {
    id: 'o6',
    clientName: 'Academia Força Total',
    teamName: 'Instrutores',
    phone: '(11) 94444-1122',
    deadline: '2026-06-12',
    priority: 'normal',
    serviceType: 'colete',
    totalQuantity: 10,
    sizeGrid: { PP: 0, P: 2, M: 3, G: 3, GG: 2, XG: 0, XGG: 0, infantil: 0, outros: '' },
    model: 'regata',
    observations: 'Colete fitness com logo grande nas costas.',
    colors: 'Verde neon e preto',
    designerId: 'd2',
    status: 'sublimacao',
    createdAt: '2026-05-18T15:00:00Z',
    updatedAt: '2026-05-31T11:00:00Z',
    approvedAt: '2026-05-28T14:00:00Z',
    approvedBy: 'Marcos - Proprietário',
    comments: [],
    history: [],
    files: [],
    checklist: {
      logoConferida: true,
      nomeConferido: true,
      numeroConferido: true,
      coresConferidas: true,
      tamanhosConferidos: true,
      mockupFrenteConferido: true,
      mockupCostasConferido: true,
      arquivoAltaQualidade: true,
      arquivoProntoImpressao: true,
      clienteAprovou: true
    }
  }
]

const initialNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'cliente-aprovou',
    title: 'Arte aprovada!',
    message: 'Restaurante Sabor & Arte aprovou o mockup.',
    orderId: 'o5',
    read: false,
    createdAt: '2026-05-30T09:00:00Z'
  },
  {
    id: 'n2',
    type: 'prazo-proximo',
    title: 'Prazo próximo',
    message: 'Banda Rock Nacional - entrega em 2 dias!',
    orderId: 'o3',
    read: false,
    createdAt: '2026-05-31T08:00:00Z'
  },
  {
    id: 'n3',
    type: 'nova-tarefa',
    title: 'Novo pedido',
    message: 'Escola Municipal criou um novo pedido.',
    orderId: 'o4',
    read: true,
    createdAt: '2026-05-31T08:00:00Z'
  }
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      orders: initialOrders,
      designers: initialDesigners,
      notifications: initialNotifications,
      currentUser: { id: 'admin', name: 'Graziela', role: 'admin' },

      addOrder: (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `o${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
          history: [{
            id: `h${Date.now()}`,
            action: 'Pedido criado',
            userId: get().currentUser?.id || 'unknown',
            userName: get().currentUser?.name || 'Desconhecido',
            createdAt: new Date().toISOString()
          }],
          checklist: {
            logoConferida: false,
            nomeConferido: false,
            numeroConferido: false,
            coresConferidas: false,
            tamanhosConferidos: false,
            mockupFrenteConferido: false,
            mockupCostasConferido: false,
            arquivoAltaQualidade: false,
            arquivoProntoImpressao: false,
            clienteAprovou: false
          }
        }
        set((state) => ({ orders: [...state.orders, newOrder] }))
        
        // Add notification
        get().addNotification({
          type: 'nova-tarefa',
          title: 'Novo pedido criado',
          message: `${orderData.clientName} - ${orderData.serviceType}`,
          orderId: newOrder.id
        })
      },

      updateOrder: (id, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id
              ? { 
                  ...order, 
                  ...updates, 
                  updatedAt: new Date().toISOString(),
                  history: [
                    ...order.history,
                    {
                      id: `h${Date.now()}`,
                      action: 'Pedido atualizado',
                      userId: get().currentUser?.id || 'unknown',
                      userName: get().currentUser?.name || 'Desconhecido',
                      createdAt: new Date().toISOString()
                    }
                  ]
                }
              : order
          )
        }))
      },

      deleteOrder: (id) => {
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id)
        }))
      },

      moveOrder: (id, newStatus) => {
        const order = get().orders.find(o => o.id === id)
        if (!order) return

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? { 
                  ...o, 
                  status: newStatus, 
                  updatedAt: new Date().toISOString(),
                  history: [
                    ...o.history,
                    {
                      id: `h${Date.now()}`,
                      action: `Status alterado para "${getStatusLabel(newStatus)}"`,
                      userId: get().currentUser?.id || 'unknown',
                      userName: get().currentUser?.name || 'Desconhecido',
                      createdAt: new Date().toISOString()
                    }
                  ]
                }
              : o
          )
        }))
      },

      addComment: (orderId, content) => {
        const user = get().currentUser
        if (!user) return

        const newComment: Comment = {
          id: `c${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          content,
          createdAt: new Date().toISOString()
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, comments: [...order.comments, newComment] }
              : order
          )
        }))
      },

      addFile: (orderId, file) => {
        const newFile: FileAttachment = {
          ...file,
          id: `f${Date.now()}`,
          uploadedAt: new Date().toISOString()
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, files: [...order.files, newFile] }
              : order
          )
        }))

        get().addNotification({
          type: 'arquivo-enviado',
          title: 'Novo arquivo enviado',
          message: `${file.name} foi adicionado ao pedido`,
          orderId
        })
      },

      updateChecklist: (orderId, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, checklist: { ...order.checklist, ...updates } }
              : order
          )
        }))
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `n${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }))
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          )
        }))
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true }))
        }))
      },

      setCurrentUser: (user) => {
        set({ currentUser: user })
      }
    }),
    {
      name: 'printflow-storage'
    }
  )
)

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
