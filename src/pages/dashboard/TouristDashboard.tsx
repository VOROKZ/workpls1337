import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Check, X, ChevronRight, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

export default function TouristDashboard() {
  const { user, touristProfile } = useAuthStore()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'past'>('all')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*, hotel_profiles(name, city), rooms(name, type)')
      .eq('tourist_id', user!.id)
      .order('created_at', { ascending: false })
    setBookings((data as BookingWithDetails[]) ?? [])
    setLoading(false)
  }

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'active') return ['pending', 'confirmed'].includes(b.status)
    if (activeTab === 'past') return ['completed', 'cancelled'].includes(b.status)
    return true
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Добро пожаловать, {touristProfile?.first_name || 'Турист'}!
        </h1>
        <p className="text-muted-foreground mt-1">Управляйте своими бронированиями</p>
      </div>

      {/* Profile card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="sm:col-span-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {touristProfile?.first_name?.[0] || 'T'}
            </div>
            <div>
              <div className="font-semibold">{touristProfile?.first_name} {touristProfile?.last_name}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              {touristProfile?.phone && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {touristProfile.phone}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link to="/dashboard/settings">Изменить</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{bookings.filter(b => b.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground mt-1">Завершённых поездок</div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Мои бронирования</h2>
          <Button size="sm" asChild>
            <Link to="/hotels">Найти отель <ChevronRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'active', 'past'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {tab === 'all' ? 'Все' : tab === 'active' ? 'Активные' : 'Завершённые'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">Бронирований пока нет</p>
            <Button asChild variant="outline">
              <Link to="/hotels">Найти отель</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => {
              const status = STATUS_CONFIG[booking.status]
              return (
                <Card key={booking.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{booking.hotel_profiles?.name}</span>
                          <Badge variant={status.variant} className="text-xs flex items-center gap-1">
                            {status.icon} {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="w-3.5 h-3.5" /> {booking.hotel_profiles?.city}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(booking.check_in_date).toLocaleDateString('ru-RU')} — {new Date(booking.check_out_date).toLocaleDateString('ru-RU')}
                          </span>
                          <span>{booking.nights} ночей</span>
                          <span>{booking.rooms?.name}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary">{booking.final_price.toLocaleString('ru')} ₽</div>
                        {booking.discount_amount > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {booking.total_price.toLocaleString('ru')} ₽
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
