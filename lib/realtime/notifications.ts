// Sistema de Notificações em Tempo Real com Supabase Realtime
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link: string | null
  created_at: string
}

export class RealtimeNotifications {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private userId: string | null = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (user) {
      this.userId = user.id
    }
  }

  // Inscrever para notificações do usuário atual
  subscribeToUserNotifications(
    callback: (payload: RealtimePostgresChangesPayload<Notification>) => void
  ) {
    if (!this.userId) return null

    const channelName = `user_notifications_${this.userId}`
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`
        },
        callback
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Inscrever para mudanças em pedidos (para designers e admins)
  subscribeToOrders(
    callback: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
  ) {
    const channelName = 'orders_changes'
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        callback
      )
      .subscribe((status) => {
        console.log('Orders subscription status:', status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Inscrever para mudanças em kanban (status changes)
  subscribeToOrderStatus(
    callback: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void
  ) {
    const channelName = 'order_status_changes'
    
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.design'
        },
        callback
      )
      .subscribe((status) => {
        console.log('Order status subscription status:', status)
      })

    this.channels.set(channelName, channel)
    return channel
  }

  // Cancelar inscrição
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Cancelar todas as inscrições
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // Criar notificação
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read'>) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        ...notification,
        read: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string) {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
  }

  // Marcar todas como lidas
  async markAllAsRead() {
    if (!this.userId) return

    const { error } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', this.userId)
      .eq('read', false)

    if (error) throw error
  }

  // Contar notificações não lidas
  async getUnreadCount(): Promise<number> {
    if (!this.userId) return 0

    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('read', false)

    if (error) throw error
    return count || 0
  }

  // Buscar notificações recentes
  async getRecentNotifications(limit: number = 10) {
    if (!this.userId) return []

    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }
}

// Singleton instance
export const realtimeNotifications = new RealtimeNotifications()
