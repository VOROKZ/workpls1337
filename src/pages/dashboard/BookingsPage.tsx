import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Check, X, ChevronRight, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Booking } from '@/lib/database.types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Ожидает', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: 'Подтверждено', variant: 'default', icon: <Check className="w-3 h-3" /> },
  completed: { label: 'Завершено', variant: 'outline', icon: <Check className="w-3 h-3" /> },
  cancelled: { label: 'Отменено', variant: 'destructive', icon: <X className="w-3 h-3" /> },
}

interface BookingWithDetails extends Booking {
  hotel_profiles: { name: string; city: string }
  rooms: { name: string; type: string }
}

// Hotel-side booking view
interface HotelBookingView extends Booking {
  rooms: { name: string }
}

export default function BookingsPage() {
  const { user, hotelProfile } = useAuthStore()
  const [bookings, setBookings] = useState<BookingWithDetails[] | HotelBookingView[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'past'>('all')
  const [search, setSearch] = useState('')

  const isHotel = user?.role === 'hotel'

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    if (isHotel && hotelProfile) {
      const { data } = await supabase
        .from('bookings')
        .select('*, rooms(name)')
        .eq('hotel_id', hotelProfile.id)
        .order('created_at', { ascending: false })
      setBookings((data as HotelBookingView[]) ?? [])
    } else {
      const { data } = await supabase
        .from('bookings')
        .select('*, hotel_profiles(name, city), rooms(name, type)')
        .eq('tourist_id', user!.id)
        .order('created_at', { ascending: false })
      setBookings((data as BookingWithDetails[]) ?? [])
    }
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    const matchesTab =
      activeTab === 'active' ? ['pending', 'confirmed'].includes(b.status) :
      activeTab === 'past' ? ['completed', 'cancelled'].includes(b.status) : true

    if (!matchesTab) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      if (isHotel) {
        const hb = b as HotelBookingView
        return (
          hb.tourist_first_name.toLowerCase().includes(q) ||
          hb.tourist_last_name.toLowerCase().includes(q) ||
          hb.id.toLowerCase().includes(q)
        )
      } else {
        const tb = b as BookingWithDetails
        return (
          tb.hotel_profiles?.name.toLowerCase().includes(q) ||
          tb.hotel_profiles?.city.toLowerCase().includes(q) ||
          tb.id.toLowerCase().includes(q)
        )
      }
    }
    return true
  })

  const TABS = [
    { id: 'all' as const, label: 'Все' },
    { id: 'active' as const, label: 'Активные' },
    { id: 'past' as const, label: 'Завершённые' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isHotel ? 'Бронирования' : 'Мои бронирования'}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isHotel ? `Все брони отеля ${hotelProfile?.name}` : 'История ваших поездок'}
          </p>
        </div>
        {!isHotel && (
          <Button size="sm" asChild>
            <Link to="/hotels">Найти отель <ChevronRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        )}
      </div>

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isHotel ? 'Поиск по гостю или ID...' : 'Поиск по отелю или ID...'}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="mb-4">{search ? 'Ничего не найдено' : 'Бронирований пока нет'}</p>
          {!isHotel && !search && (
            <Button asChild variant="outline">
              <Link to="/hotels">Найти отель</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {isHotel
            ? (filtered as HotelBookingView[]).map(b => {
                const status = STATUS_CONFIG[b.status]
                return (
                  <Card key={b.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{b.tourist_first_name} {b.tourist_last_name}</span>
                            <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                              {status.icon} {status.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(b.check_in_date).toLocaleDateString('ru-RU')} — {new Date(b.check_out_date).toLocaleDateString('ru-RU')}
                            </span>
                            <span>{b.nights} ночей</span>
                            <span>{b.rooms?.name}</span>
                            {b.tourist_phone && <span>{b.tourist_phone}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-primary">{b.final_price.toLocaleString('ru')} ₽</div>
                          <div className="text-xs text-muted-foreground mt-1">#{b.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            : (filtered as BookingWithDetails[]).map(b => {
                const status = STATUS_CONFIG[b.status]
                return (
                  <Card key={b.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{b.hotel_profiles?.name}</span>
                            <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                              {status.icon} {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="w-3.5 h-3.5" /> {b.hotel_profiles?.city}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(b.check_in_date).toLocaleDateString('ru-RU')} — {new Date(b.check_out_date).toLocaleDateString('ru-RU')}
                            </span>
                            <span>{b.nights} ночей</span>
                            <span>{b.rooms?.name}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-primary">{b.final_price.toLocaleString('ru')} ₽</div>
                          {b.discount_amount > 0 && (
                            <div className="text-xs text-muted-foreground line-through">{b.total_price.toLocaleString('ru')} ₽</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">#{b.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
