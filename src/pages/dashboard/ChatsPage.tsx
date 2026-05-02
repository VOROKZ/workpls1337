import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Hotel, Send, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface HotelChat {
  id: string
  hotel_id: string
  name: string
  hotel_profiles: { name: string; city: string }
}

interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: { full_name: string | null; email: string }
}

export default function ChatsPage() {
  const { user } = useAuthStore()
  const [chats, setChats] = useState<HotelChat[]>([])
  const [selectedChat, setSelectedChat] = useState<HotelChat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChats()
  }, [])

  useEffect(() => {
    if (!selectedChat) return
    fetchMessages(selectedChat.id)

    const sub = supabase
      .channel(`hotel-chat-${selectedChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hotel_chat_messages',
        filter: `chat_id=eq.${selectedChat.id}`,
      }, async (payload) => {
        const msg = payload.new as ChatMessage
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', msg.sender_id)
          .maybeSingle()
        setMessages(prev => [...prev, { ...msg, sender: sender ?? { full_name: null, email: '' } }])
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [selectedChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchChats = async () => {
    setLoadingChats(true)
    const { data } = await supabase
      .from('hotel_chats')
      .select('*, hotel_profiles(name, city)')
      .order('created_at', { ascending: false })
    setChats((data as HotelChat[]) ?? [])
    setLoadingChats(false)
  }

  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true)
    const { data } = await supabase
      .from('hotel_chat_messages')
      .select('*, sender:profiles(full_name, email)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((data as ChatMessage[]) ?? [])
    setLoadingMessages(false)
  }

  const sendMessage = async () => {
    if (!text.trim() || !user || !selectedChat) return
    setSending(true)
    const { error } = await supabase.from('hotel_chat_messages').insert({
      chat_id: selectedChat.id,
      sender_id: user.id,
      content: text.trim(),
    })
    if (error) toast.error('Ошибка отправки')
    else setText('')
    setSending(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Чаты</h1>
        <p className="text-muted-foreground text-sm mt-1">Общайтесь с отелями и путешественниками</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[500px]">
        {/* Chat list */}
        <div className="w-72 shrink-0 flex flex-col border border-border rounded-xl overflow-hidden bg-card">
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Чаты отелей</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Hotel className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Нет активных чатов</p>
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link to="/hotels">Найти отель</Link>
                </Button>
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    'w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors',
                    selectedChat?.id === chat.id && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Hotel className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{chat.hotel_profiles?.name || chat.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{chat.hotel_profiles?.city}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card">
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Выберите чат слева</p>
              {chats.length === 0 && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/hotels">Перейти к отелям</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hotel className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedChat.hotel_profiles?.name || selectedChat.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedChat.hotel_profiles?.city} · Публичный чат</div>
                </div>
                <Badge variant="secondary" className="ml-auto text-xs">
                  <Users className="w-3 h-3 mr-1" /> Публичный
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                      <Skeleton className="h-12 w-2/3" />
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Начните общение!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.id
                    const senderName = msg.sender?.full_name || msg.sender?.email || 'Пользователь'
                    const initials = senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    const showName = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id
                    const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div key={msg.id} className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
                        {showName ? (
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className={cn('text-[10px]', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        ) : <div className="w-7 shrink-0" />}
                        <div className={cn('max-w-[65%]', isOwn && 'items-end flex flex-col')}>
                          {showName && !isOwn && (
                            <span className="text-xs text-muted-foreground mb-0.5 px-1">{senderName}</span>
                          )}
                          <div className={cn(
                            'px-3 py-2 rounded-2xl text-sm',
                            isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{time}</span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Написать сообщение..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!text.trim() || sending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
