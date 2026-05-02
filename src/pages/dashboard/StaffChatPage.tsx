import { useState, useEffect, useRef } from 'react'
import { Send, Hash, Megaphone, Wrench, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { StaffChatMessage } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Channel = 'general' | 'housekeeping' | 'maintenance' | 'announcements'

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Общий', icon: <Hash className="w-4 h-4" /> },
  { id: 'housekeeping', label: 'Уборка', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'maintenance', label: 'Техслужба', icon: <Wrench className="w-4 h-4" /> },
  { id: 'announcements', label: 'Объявления', icon: <Megaphone className="w-4 h-4" /> },
]

interface MessageWithSender extends Omit<StaffChatMessage, 'sender'> {
  sender: { full_name: string | null; email: string }
}

export default function StaffChatPage() {
  const { user, staffRecords } = useAuthStore()
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [channel, setChannel] = useState<Channel>('general')
  const [selectedHotelId, setSelectedHotelId] = useState(staffRecords[0]?.hotel_id || '')
  const bottomRef = useRef<HTMLDivElement>(null)
  const staffRecord = staffRecords.find(s => s.hotel_id === selectedHotelId)
  const canAnnounce = staffRecord?.role_in_hotel === 'owner' || staffRecord?.role_in_hotel === 'manager'

  useEffect(() => {
    if (!selectedHotelId) return
    fetchMessages()

    const sub = supabase
      .channel(`staff-chat-${selectedHotelId}-${channel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hotel_staff_chat',
        filter: `hotel_id=eq.${selectedHotelId}`,
      }, async (payload) => {
        const newMsg = payload.new as StaffChatMessage
        if (newMsg.channel !== channel) return
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', newMsg.sender_id)
          .maybeSingle()
        setMessages(prev => [...prev, { ...newMsg, sender: sender ?? { full_name: null, email: '' } }])
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [selectedHotelId, channel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_staff_chat')
      .select('*, sender:profiles(full_name, email)')
      .eq('hotel_id', selectedHotelId)
      .eq('channel', channel)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((data as MessageWithSender[]) ?? [])
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!text.trim() || !user || !selectedHotelId) return
    if (channel === 'announcements' && !canAnnounce) {
      toast.error('Только менеджеры и владельцы могут публиковать объявления')
      return
    }
    setSending(true)
    const { error } = await supabase.from('hotel_staff_chat').insert({
      hotel_id: selectedHotelId,
      sender_id: user.id,
      message: text.trim(),
      channel,
      is_announcement: channel === 'announcements',
      mentions: [],
    })
    if (error) toast.error('Ошибка отправки')
    else setText('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Чат сотрудников</h1>
        <p className="text-muted-foreground text-sm mt-1">Внутренние переписки — не видны туристам и инфлюенсерам</p>
      </div>

      {staffRecords.length > 1 && (
        <div className="flex gap-2 mb-4">
          {staffRecords.map(s => (
            <Button
              key={s.hotel_id}
              size="sm"
              variant={selectedHotelId === s.hotel_id ? 'default' : 'outline'}
              onClick={() => setSelectedHotelId(s.hotel_id)}
            >
              Отель {s.hotel_id.slice(0, 6)}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[480px]">
        {/* Channel sidebar */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Каналы</div>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              disabled={ch.id === 'announcements' && !canAnnounce && channel !== 'announcements'}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left w-full',
                channel === ch.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ch.id === 'announcements' && !canAnnounce ? 'opacity-60' : ''
              )}
            >
              {ch.icon}
              <span>{ch.label}</span>
              {ch.id === 'announcements' && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">VIP</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card">
          {/* Channel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            {CHANNELS.find(c => c.id === channel)?.icon}
            <span className="font-semibold">{CHANNELS.find(c => c.id === channel)?.label}</span>
            {channel === 'announcements' && (
              <span className="text-xs text-muted-foreground ml-2">Только менеджеры и владельцы могут писать</span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-2/3" />
                  </div>
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Сообщений пока нет. Начните переписку!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id
                const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id
                const senderName = msg.sender?.full_name || msg.sender?.email || 'Сотрудник'
                const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={msg.id} className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
                    {showAvatar ? (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className={cn('text-xs', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    <div className={cn('max-w-[70%] space-y-0.5', isOwn && 'items-end flex flex-col')}>
                      {showAvatar && (
                        <div className={cn('flex items-baseline gap-2', isOwn && 'flex-row-reverse')}>
                          <span className="text-xs font-medium">{isOwn ? 'Вы' : senderName}</span>
                          <span className="text-[10px] text-muted-foreground">{time}</span>
                        </div>
                      )}
                      <div className={cn(
                        'px-3 py-2 rounded-2xl text-sm leading-relaxed',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : msg.is_announcement
                            ? 'bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100 rounded-bl-sm'
                            : 'bg-muted rounded-bl-sm'
                      )}>
                        {msg.is_announcement && (
                          <div className="flex items-center gap-1 text-xs font-semibold mb-1 opacity-70">
                            <Megaphone className="w-3 h-3" /> Объявление
                          </div>
                        )}
                        {msg.message}
                      </div>
                      {!showAvatar && (
                        <span className={cn('text-[10px] text-muted-foreground px-1', isOwn && 'text-right')}>{time}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            {channel === 'announcements' && !canAnnounce ? (
              <div className="text-center text-sm text-muted-foreground py-2">
                Только менеджеры и владельцы могут писать в этот канал
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Написать в #${CHANNELS.find(c => c.id === channel)?.label.toLowerCase()}...`}
                  className="flex-1"
                  disabled={sending}
                />
                <Button size="icon" onClick={sendMessage} disabled={!text.trim() || sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
