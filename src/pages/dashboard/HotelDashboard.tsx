import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Calendar, Star, Users, TrendingUp,
  Plus, Check, X, Settings, BedDouble
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Booking, AmbassadorApplication, HotelStaff } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'text-amber-600 bg-amber-50' },
  confirmed: { label: 'Подтверждено', color: 'text-green-700 bg-green-50' },
  completed: { label: 'Завершено', color: 'text-blue-700 bg-blue-50' },
  cancelled: { label: 'Отменено', color: 'text-red-700 bg-red-50' },
}

interface BookingWithTourist extends Booking {
  profiles: { full_name: string; email: string }
  rooms: { name: string }
}
interface ApplicationWithInfluencer extends AmbassadorApplication {
  influencer_profiles: { first_name: string; last_name: string; followers_count: number; instagram_url: string | null }
}
interface StaffWithProfile extends HotelStaff {
  profiles: { full_name: string; email: string }
}

export default function HotelDashboard() {
  const { hotelProfile } = useAuthStore()
  const [bookings, setBookings] = useState<BookingWithTourist[]>([])
  const [applications, setApplications] = useState<ApplicationWithInfluencer[]>([])
  const [staff, setStaff] = useState<StaffWithProfile[]>([])
  const [stats, setStats] = useState({ bookings: 0, revenue: 0, reviews: 0, influencers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (hotelProfile) fetchData()
  }, [hotelProfile])

  const fetchData = async () => {
    setLoading(true)
    const [bookRes, appRes, staffRes, statsRes] = await Promise.all([
      supabase.from('bookings').select('*, profiles(full_name, email), rooms(name)').eq('hotel_id', hotelProfile!.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('ambassador_applications').select('*, influencer_profiles(first_name, last_name, followers_count, instagram_url)').eq('hotel_id', hotelProfile!.id).order('created_at', { ascending: false }),
      supabase.from('hotel_staff').select('*, profiles(full_name, email)').eq('hotel_id', hotelProfile!.id),
      Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelProfile!.id),
        supabase.from('bookings').select('final_price').eq('hotel_id', hotelProfile!.id).eq('status', 'completed'),
        supabase.from('hotel_reviews').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelProfile!.id),
        supabase.from('ambassador_applications').select('*', { count: 'exact', head: true }).eq('hotel_id', hotelProfile!.id).eq('status', 'approved'),
      ]),
    ])
    setBookings((bookRes.data as BookingWithTourist[]) ?? [])
    setApplications((appRes.data as ApplicationWithInfluencer[]) ?? [])
    setStaff((staffRes.data as StaffWithProfile[]) ?? [])
    const [{ count: bCount }, revData, { count: rCount }, { count: iCount }] = statsRes
    const rev = (revData.data ?? []).reduce((s: number, b: any) => s + b.final_price, 0)
    setStats({ bookings: bCount ?? 0, revenue: rev, reviews: rCount ?? 0, influencers: iCount ?? 0 })
    setLoading(false)
  }

  const handleApplicationAction = async (id: string, action: 'approved' | 'rejected', response: string) => {
    const { error } = await supabase
      .from('ambassador_applications')
      .update({ status: action, hotel_response: response })
      .eq('id', id)
    if (!error) {
      toast.success(action === 'approved' ? 'Заявка одобрена' : 'Заявка отклонена')
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: action } : a))
    }
  }

  if (!hotelProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Профиль отеля не найден</h2>
        <p className="text-muted-foreground text-sm">Пожалуйста, заполните профиль отеля</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{hotelProfile.name}</h1>
          <p className="text-muted-foreground">{hotelProfile.city}, {hotelProfile.address}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard/rooms"><BedDouble className="mr-2 w-4 h-4" /> Номера</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/settings"><Settings className="mr-2 w-4 h-4" /> Настройки</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Всего бронирований', value: stats.bookings, icon: <Calendar className="w-5 h-5" /> },
          { label: 'Доход', value: `${stats.revenue.toLocaleString('ru')} ₽`, icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Отзывов', value: stats.reviews, icon: <Star className="w-5 h-5" /> },
          { label: 'Инфлюенсеров', value: stats.influencers, icon: <Users className="w-5 h-5" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-muted-foreground">{stat.icon}</div>
              </div>
              <div className="text-2xl font-bold text-primary">{loading ? '...' : stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="mb-4">
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
          <TabsTrigger value="applications">Заявки инфлюенсеров</TabsTrigger>
          <TabsTrigger value="staff">Сотрудники</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Последние бронирования</h2>
            <Button size="sm" variant="outline" asChild>
              <Link to="/dashboard/bookings">Все бронирования</Link>
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Бронирований пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => {
                const status = STATUS_CONFIG[b.status]
                return (
                  <Card key={b.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{b.tourist_first_name} {b.tourist_last_name}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {b.rooms?.name} · {new Date(b.check_in_date).toLocaleDateString('ru-RU')} — {new Date(b.check_out_date).toLocaleDateString('ru-RU')} ({b.nights} ночей)
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold">{b.final_price.toLocaleString('ru')} ₽</div>
                          <div className="text-xs text-muted-foreground">#{b.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Заявок пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {app.influencer_profiles?.first_name} {app.influencer_profiles?.last_name}
                          </span>
                          <Badge variant={app.status === 'pending' ? 'secondary' : app.status === 'approved' ? 'default' : 'destructive'}>
                            {app.status === 'pending' ? 'Новая' : app.status === 'approved' ? 'Одобрено' : app.status === 'rejected' ? 'Отклонено' : 'Завершена'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {app.influencer_profiles?.followers_count?.toLocaleString('ru')} подписчиков
                          {app.influencer_profiles?.instagram_url && ` · Instagram`}
                        </div>
                        {app.message && <p className="text-sm mt-2 text-foreground">{app.message}</p>}
                      </div>
                      {app.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" onClick={() => handleApplicationAction(app.id, 'approved', 'Заявка одобрена')} className="h-8">
                            <Check className="w-3.5 h-3.5 mr-1" /> Одобрить
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleApplicationAction(app.id, 'rejected', 'Заявка отклонена')} className="h-8">
                            <X className="w-3.5 h-3.5 mr-1" /> Отклонить
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="staff">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Команда отеля</h2>
            <Button size="sm" asChild>
              <Link to="/dashboard/staff"><Plus className="mr-2 w-4 h-4" /> Управление</Link>
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">Сотрудников пока нет</p>
              <Button asChild size="sm">
                <Link to="/dashboard/staff"><Plus className="mr-2 w-4 h-4" /> Добавить сотрудника</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                      {s.profiles?.full_name?.slice(0, 2).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{s.profiles?.full_name || 'Сотрудник'}</div>
                      <div className="text-sm text-muted-foreground">{s.profiles?.email}</div>
                    </div>
                    <Badge variant="outline">{
                      s.role_in_hotel === 'owner' ? 'Владелец' :
                      s.role_in_hotel === 'manager' ? 'Менеджер' :
                      s.role_in_hotel === 'receptionist' ? 'Ресепшн' :
                      s.role_in_hotel === 'cleaner' ? 'Горничная' : 'Техслужба'
                    }</Badge>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                      {s.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
