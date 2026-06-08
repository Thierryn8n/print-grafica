// Serviço de Calendário
import { createClient } from "@/lib/supabase/client"

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_type: 'deadline' | 'meeting' | 'maintenance' | 'delivery' | 'reminder' | 'other'
  start_date: string
  end_date: string
  all_day: boolean
  location: string | null
  order_id: string | null
  user_id: string | null
  color: string
  reminder_minutes: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  event_id: string
  reminder_time: string
  sent: boolean
  sent_at: string | null
  created_at: string
}

export class CalendarService {
  private supabase = createClient()

  // Criar evento
  async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Buscar eventos por período
  async getEvents(startDate: string, endDate: string, userId?: string): Promise<CalendarEvent[]> {
    let query = this.supabase
      .from('calendar_events')
      .select('*')

    query = query.gte('start_date', startDate).lte('end_date', endDate)

    if (userId) {
      query = query.or(`user_id.eq.${userId},created_by.eq.${userId}`)
    }

    const { data, error } = await query.order('start_date', { ascending: true })
    if (error) throw error
    return data || []
  }

  // Buscar evento por ID
  async getEventById(id: string): Promise<CalendarEvent | null> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data
  }

  // Atualizar evento
  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Deletar evento
  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.supabase.from('calendar_events').delete().eq('id', id)
    if (error) throw error
  }

  // Criar evento de prazo de entrega
  async createDeliveryDeadline(orderId: string, orderNumber: string, deadline: string, clientName: string): Promise<CalendarEvent> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    const event = await this.createEvent({
      title: `Prazo: Pedido #${orderNumber}`,
      description: `Prazo de entrega para pedido do cliente ${clientName}`,
      event_type: 'deadline',
      start_date: deadline,
      end_date: new Date(new Date(deadline).getTime() + 60 * 60 * 1000).toISOString(), // +1 hora
      all_day: false,
      location: null,
      order_id: orderId,
      user_id: null,
      color: '#ef4444',
      reminder_minutes: 1440, // 24 horas antes
      created_by: user?.id || ''
    })

    // Criar lembrete
    if (event.reminder_minutes) {
      await this.createReminder(event.id, new Date(new Date(deadline).getTime() - event.reminder_minutes * 60 * 1000).toISOString())
    }

    return event
  }

  // Criar evento de reunião
  async createMeetingEvent(
    title: string,
    start: string,
    end: string,
    location: string,
    userId: string,
    description?: string
  ): Promise<CalendarEvent> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    return this.createEvent({
      title,
      description: description || null,
      event_type: 'meeting',
      start_date: start,
      end_date: end,
      all_day: false,
      location,
      order_id: null,
      user_id: userId,
      color: '#3b82f6',
      reminder_minutes: 30,
      created_by: user?.id || ''
    })
  }

  // Criar evento de manutenção
  async createMaintenanceEvent(
    printerName: string,
    date: string,
    description: string
  ): Promise<CalendarEvent> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    return this.createEvent({
      title: `Manutenção: ${printerName}`,
      description,
      event_type: 'maintenance',
      start_date: date,
      end_date: new Date(new Date(date).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
      all_day: false,
      location: 'Área de Produção',
      order_id: null,
      user_id: null,
      color: '#f59e0b',
      reminder_minutes: 60,
      created_by: user?.id || ''
    })
  }

  // Lembretes
  async createReminder(eventId: string, reminderTime: string): Promise<Reminder> {
    const { data, error } = await this.supabase
      .from('reminders')
      .insert({ event_id: eventId, reminder_time: reminderTime })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getReminders(eventId: string): Promise<Reminder[]> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select('*')
      .eq('event_id', eventId)
      .order('reminder_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  async markReminderAsSent(reminderId: string): Promise<void> {
    await this.supabase
      .from('reminders')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', reminderId)
  }

  // Buscar lembretes pendentes
  async getPendingReminders(): Promise<Reminder[]> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select(`
        *,
        calendar_events (
          title,
          event_type,
          user_id
        )
      `)
      .eq('sent', false)
      .lte('reminder_time', new Date().toISOString())
      .order('reminder_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Buscar eventos por tipo
  async getEventsByType(eventType: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('event_type', eventType)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Buscar eventos por pedido
  async getEventsByOrder(orderId: string): Promise<CalendarEvent[]> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('order_id', orderId)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Obter resumo do calendário
  async getCalendarSummary(startDate: string, endDate: string): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    upcomingDeadlines: number
    upcomingMeetings: number
  }> {
    const events = await this.getEvents(startDate, endDate)

    const eventsByType: Record<string, number> = {}
    events.forEach(event => {
      eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
    })

    const upcomingDeadlines = events.filter(e => e.event_type === 'deadline').length
    const upcomingMeetings = events.filter(e => e.event_type === 'meeting').length

    return {
      totalEvents: events.length,
      eventsByType,
      upcomingDeadlines,
      upcomingMeetings
    }
  }
}

export const calendarService = new CalendarService()
