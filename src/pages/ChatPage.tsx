import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, Building2, ArrowLeft, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelChatMessage, Profile } from '@/lib/database.types'

interface ChatWithSender extends HotelChatMessage {
  profiles: Profile
}

export default function HotelChatPage() {
  const { hotelId } = useParams<{ hotelId: string }>()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatWithSender[]>([])
  const [hotel, setHotel] = useState<any>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (hotelId) initChat()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [hotelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initChat = async () => {
    setLoading(true)
    const hotelRes = await supabase.from('hotel_profiles').select('*').eq('id', hotelId!).maybeSingle()
    setHotel(hotelRes.data)

    let { data: chat } = await supabase.from('hotel_chats').select('*').eq('hotel_id', hotelId!).maybeSingle()
    if (!chat) {
      const { data: newChat, error: insertError } = await supabase
        .from('hotel_chats')
        .insert({ hotel_id: hotelId })
        .select()
        .single()
      if (insertError) {
        const { data: retryChat } = await supabase.from('hotel_chats').select('*').eq('hotel_id', hotelId!).maybeSingle()
        chat = retryChat
      } else {
        chat = newChat
      }
    }
    if (!chat) { setLoading(false); return }
    setChatId(chat.id)

    const { data: msgs } = await supabase
      .from('hotel_chat_messages')
      .select('*, profiles(*)')
      .eq('chat_id', chat.id)
      .order('created_at')
      .limit(100)
    setMessages((msgs as ChatWithSender[]) ?? [])
    setLoading(false)

    const sub = supabase
      .channel(`hotel-chat-${chat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hotel_chat_messages',
        filter: `chat_id=eq.${chat.id}`,
      }, async (payload) => {
        // Skip if it's from current user — already added optimistically
        if (payload.new.sender_id === user?.id) return
        const { data: msg } = await supabase
          .from('hotel_chat_messages')
          .select('*, profiles(*)')
          .eq('id', payload.new.id)
          .single()
        if (msg) setMessages(prev => [...prev, msg as ChatWithSender])
      })
      .subscribe()

    channelRef.current = sub
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    // Optimistic — show immediately with local profile data
    const optimisticId = `opt-${Date.now()}`
    const optimistic: ChatWithSender = {
      id: optimisticId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      is_moderated: false,
      created_at: new Date().toISOString(),
      profiles: user as unknown as Profile,
    }
    setMessages(prev => [...prev, optimistic])

    const { data: inserted, error } = await supabase
      .from('hotel_chat_messages')
      .insert({ chat_id: chatId, sender_id: user.id, content })
      .select('id')
      .single()

    if (error || !inserted) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setNewMessage(content)
      setSending(false)
      return
    }

    // Fetch real record with profile join
    const { data: real } = await supabase
      .from('hotel_chat_messages')
      .select('*, profiles(*)')
      .eq('id', inserted.id)
      .single()

    if (real) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? real as ChatWithSender : m))
    }
    setSending(false)
  }

  const getSenderLink = (msg: ChatWithSender) => {
    if (!msg.profiles) return null
    if (msg.profiles.role === 'hotel') return `/hotels/${hotelId}`
    if (msg.profiles.role === 'influencer') return null // no public influencer profile page yet
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
          <Link to={`/hotels/${hotelId}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <Link to={`/hotels/${hotelId}`} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Building2 className="w-4 h-4 text-primary" />
        </Link>
        <div>
          <Link to={`/hotels/${hotelId}`} className="font-medium text-sm hover:text-primary transition-colors">
            {hotel?.name || 'Чат отеля'}
          </Link>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {hotel?.city}
            <Users className="w-3 h-3 ml-2" /> Общий чат гостей
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className="h-10 w-48 rounded-xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Начните общение в чате отеля!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === user?.id
            const name = msg.profiles?.full_name || 'Гость'
            const initials = name.slice(0, 2).toUpperCase()
            const link = getSenderLink(msg)
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                  link ? (
                    <Link to={link}>
                      <Avatar className="w-8 h-8 shrink-0 hover:ring-2 hover:ring-primary/40 transition-all">
                        <AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs bg-secondary">{initials}</AvatarFallback>
                    </Avatar>
                  )
                )}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isOwn && <span className="text-xs text-muted-foreground px-1">{name}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Написать сообщение..."
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
