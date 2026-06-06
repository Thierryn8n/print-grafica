// Hook React para notificações em tempo real
import { useEffect, useState, useCallback } from "react"
import { realtimeNotifications } from "@/lib/realtime/notifications"
import type { Notification } from "@/lib/realtime/notifications"

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carregar notificações iniciais
  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  // Inscrever para novas notificações
  useEffect(() => {
    const channel = realtimeNotifications.subscribeToUserNotifications((payload) => {
      if (payload.eventType === 'INSERT') {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // Mostrar notificação do navegador
        if (Notification.permission === 'granted') {
          new Notification(payload.new.title, {
            body: payload.new.message,
            icon: '/icon.svg'
          })
        }
      } else if (payload.eventType === 'UPDATE') {
        setNotifications(prev => 
          prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
        )
        if (payload.new.read && !payload.old.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    })

    return () => {
      if (channel) {
        realtimeNotifications.unsubscribe('user_notifications')
      }
    }
  }, [])

  async function loadNotifications() {
    try {
      const data = await realtimeNotifications.getRecentNotifications(20)
      setNotifications(data)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUnreadCount() {
    try {
      const count = await realtimeNotifications.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Erro ao carregar contagem:', error)
    }
  }

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await realtimeNotifications.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await realtimeNotifications.markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }, [])

  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    try {
      const data = await realtimeNotifications.createNotification(notification)
      setNotifications(prev => [data, ...prev])
      setUnreadCount(prev => prev + 1)
      return data
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }, [])

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refresh: loadNotifications
  }
}
