// Serviço de Chat/Mensagens
import { createClient } from "@/lib/supabase/client"

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  file_url: string | null
  read_by: string[]
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
  }
}

export interface Conversation {
  id: string
  order_id: string | null
  participant_ids: string[]
  created_at: string
  updated_at: string
  last_message?: Message
  participants?: {
    id: string
    full_name: string
    avatar_url: string | null
  }[]
}

export class ChatService {
  private supabase = createClient()

  // Criar nova conversa
  async createConversation(orderId: string | null, participantIds: string[]): Promise<Conversation> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert({
        order_id: orderId,
        participant_ids: participantIds
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Buscar conversas do usuário
  async getUserConversations(): Promise<Conversation[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await this.supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          content,
          message_type,
          file_url,
          created_at
        )
      `)
      .contains('participant_ids', `{${user.id}}`)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Buscar participantes de cada conversa
    const conversations = await Promise.all(
      (data || []).map(async (conv: any) => {
        const { data: participants } = await this.supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', (conv as any).participant_ids)

        const lastMessage = conv.messages?.[conv.messages.length - 1]

        return {
          ...conv,
          participants: participants || [],
          last_message: lastMessage
        }
      })
    )

    return conversations
  }

  // Buscar conversa por pedido
  async getConversationByOrderId(orderId: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error || !data) return null

    // Buscar participantes
    const { data: participants } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', (data as any).participant_ids)

    return {
      ...data,
      participants: participants || []
    }
  }

  // Buscar mensagens de uma conversa
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return data?.map(msg => ({
      ...msg,
      sender: msg.profiles
    })) || []
  }

  // Enviar mensagem
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'system' = 'text',
    fileUrl: string | null = null
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
        file_url: fileUrl,
        read_by: [senderId]
      })
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    return {
      ...data,
      sender: data.profiles
    }
  }

  // Marcar mensagens como lidas
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { data: messages } = await this.supabase
      .from('messages')
      .select('id, read_by')
      .eq('conversation_id', conversationId)

    if (!messages) return

    for (const message of messages) {
      if (!message.read_by.includes(userId)) {
        await this.supabase
          .from('messages')
          .update({
            read_by: [...message.read_by, userId]
          })
          .eq('id', message.id)
      }
    }
  }

  // Contar mensagens não lidas
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .not('read_by', 'cs', `{${userId}}`)

    if (error) throw error
    return count || 0
  }

  // Upload de arquivo de mensagem (bucket privado -> URL assinada)
  async uploadMessageFile(file: File, bucket: string = 'chat-files'): Promise<string> {
    const maxBytes = 50 * 1024 * 1024
    if (file.size > maxBytes) {
      throw new Error('Arquivo excede o limite de 50MB')
    }
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `messages/${fileName}`

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) throw error

    const { data, error: signErr } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365)

    if (signErr) throw signErr

    return data.signedUrl
  }

  // Buscar contatos disponíveis para iniciar conversa (designers + admins)
  async getContacts(excludeUserId: string): Promise<{ id: string; full_name: string; role: string; avatar_url: string | null }[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('role', ['admin', 'designer'])
      .eq('status', 'approved')
      .neq('id', excludeUserId)
      .order('full_name', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Encontra uma conversa direta (sem pedido) entre dois usuários, ou cria uma nova
  async getOrCreateDirectConversation(userId: string, otherId: string): Promise<Conversation> {
    const { data: existing } = await this.supabase
      .from('conversations')
      .select('*')
      .is('order_id', null)
      .contains('participant_ids', `{${userId}}`)

    const found = (existing || []).find(
      (c: any) => c.participant_ids.includes(otherId) && c.participant_ids.length === 2,
    )
    if (found) {
      const { data: participants } = await this.supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', (found as any).participant_ids)
      return { ...found, participants: participants || [] }
    }

    return this.createConversation(null, [userId, otherId])
  }

  // Inscreve-se em novas mensagens de uma conversa (Supabase Realtime)
  subscribeToMessages(conversationId: string, onInsert: (msg: Message) => void) {
    const channel = this.supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onInsert(payload.new as Message),
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  // Inscreve-se em mudanças nas conversas do usuário (para atualizar a lista)
  subscribeToConversations(onChange: () => void) {
    const channel = this.supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }
}

export const chatService = new ChatService()
