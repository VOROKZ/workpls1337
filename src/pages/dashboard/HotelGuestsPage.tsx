import { useState, useEffect } from 'react'
import { Users, Search, Calendar, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface GuestBooking {
  id: string
  tourist_first_name: string
  tourist_last_name: string
  tourist_phone: string | null
  check_in_date: string
  check_out_date: string
  nights: number
  final_price: number
  status: string
  rooms: { name: string } | null
  profiles: { email: string } | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30' },
  confirmed: { label: 'Заселён', color: 'text-green-700 bg-green-50 dark:bg-green-950/30' },
  completed: { label: 'Выехал', color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30' },
  cancelled: { label: 'Отменено', color: 'text-red-700 bg-red-50 dark:bg-red-950/30' },
}

export default function HotelGuestsPage() {
  const { hotelProfile } = useAuthStore()
  const [guests, setGuests] = useState<GuestBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed'>('all')

  useEffect(() => {
    if (hotelProfile) fetchGuests()
  }, [hotelProfile])

  const fetchGuests = async () => {
    setLoading(true)
    const query = supabase
      .from('bookings')
      .select('*, rooms(name), profiles:tourist_id(email)')
      .eq('hotel_id', hotelProfile!.id)
      .in('status', ['confirmed', 'completed', 'pending'])
      .order('check_in_date', { ascending: false })

    const { data } = await query
    setGuests((data as GuestBooking[]) ?? [])
    setLoading(false)
  }

  const filtered = guests.filter(g => {
    const matchStatus = filter === 'all' || g.status === filter
    const matchSearch = !search.trim() || (
      `${g.tourist_first_name} ${g.tourist_last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      g.tourist_phone?.includes(search)
    )
    return matchStatus && matchSearch
  })

  const confirmedCount = guests.filter(g => g.status === 'confirmed').length
  const completedCount = guests.filter(g => g.status === 'completed').length

  if (!hotelProfile) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Туристы</h1>
        <p className="text-muted-foreground text-sm mt-1">Гости, забронировавшие номера в {hotelProfile.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{confirmedCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Сейчас в отеле</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{guests.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Всего гостей</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{completedCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Уже выехали</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { id: 'all' as const, label: 'Все' },
            { id: 'confirmed' as const, label: 'В отеле' },
            { id: 'completed' as const, label: 'Выехали' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                filter === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Гостей не найдено' : 'Гостей пока нет'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => {
            const statusCfg = STATUS_MAP[g.status] || STATUS_MAP.pending
            const initials = `${g.tourist_first_name[0] || ''}${g.tourist_last_name[0] || ''}`.toUpperCase()
            return (
              <Card key={g.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{g.tourist_first_name} {g.tourist_last_name}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      {g.profiles?.email && (
                        <div className="text-sm text-muted-foreground">{g.profiles.email}</div>
                      )}
                      {g.tourist_phone && (
                        <div className="text-sm text-muted-foreground">{g.tourist_phone}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(g.check_in_date).toLocaleDateString('ru-RU')} — {new Date(g.check_out_date).toLocaleDateString('ru-RU')}
                        </span>
                        <span>{g.nights} ночей</span>
                        {g.rooms && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{g.rooms.name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-primary">{g.final_price.toLocaleString('ru')} ₽</div>
                      <div className="text-xs text-muted-foreground">#{g.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
