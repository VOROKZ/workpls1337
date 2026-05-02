import { useState, useEffect } from 'react'
import { Users, Building2, Star, Calendar, ShieldCheck, TrendingUp, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Profile } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
  const [users, setUsers] = useState<Profile[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [stats, setStats] = useState({ users: 0, hotels: 0, bookings: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [usersRes, hotelsRes, postsRes, bookingsRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('hotel_profiles').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('blog_posts').select('*, influencer_profiles(first_name, last_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('bookings').select('*, hotel_profiles(name), profiles(full_name)').order('created_at', { ascending: false }).limit(20),
      Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('hotel_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('final_price').eq('status', 'completed'),
      ]),
    ])
    setUsers(usersRes.data ?? [])
    setHotels(hotelsRes.data ?? [])
    setPosts(postsRes.data ?? [])
    setBookings(bookingsRes.data ?? [])
    const [{ count: uc }, { count: hc }, { count: bc }, revData] = statsRes
    const rev = (revData.data ?? []).reduce((s: number, b: any) => s + b.final_price, 0)
    setStats({ users: uc ?? 0, hotels: hc ?? 0, bookings: bc ?? 0, revenue: rev })
    setLoading(false)
  }

  const toggleUserBlock = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId)
    if (!error) {
      toast.success(isActive ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u))
    }
  }

  const toggleHotelActive = async (hotelId: string, isActive: boolean) => {
    const { error } = await supabase.from('hotel_profiles').update({ is_active: !isActive }).eq('id', hotelId)
    if (!error) {
      toast.success(isActive ? 'Отель скрыт' : 'Отель активирован')
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, is_active: !isActive } : h))
    }
  }

  const toggleHotelVerified = async (hotelId: string, isVerified: boolean) => {
    const { error } = await supabase.from('hotel_profiles').update({ is_verified: !isVerified }).eq('id', hotelId)
    if (!error) {
      toast.success(isVerified ? 'Верификация снята' : 'Отель верифицирован')
      setHotels(prev => prev.map(h => h.id === hotelId ? { ...h, is_verified: !isVerified } : h))
    }
  }

  const moderatePost = async (postId: string, action: 'published' | 'rejected') => {
    const { error } = await supabase.from('blog_posts').update({ status: action }).eq('id', postId)
    if (!error) {
      toast.success(action === 'published' ? 'Пост одобрен' : 'Пост отклонён')
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: action } : p))
    }
  }

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      tourist: 'Турист', hotel: 'Отель', influencer: 'Инфлюенсер',
      admin: 'Администратор', hotel_staff: 'Сотрудник'
    }
    return labels[role] || role
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Панель администратора
        </h1>
        <p className="text-muted-foreground">Управление платформой HotelHub</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Пользователей', value: stats.users, icon: <Users className="w-5 h-5" /> },
          { label: 'Отелей', value: stats.hotels, icon: <Building2 className="w-5 h-5" /> },
          { label: 'Бронирований', value: stats.bookings, icon: <Calendar className="w-5 h-5" /> },
          { label: 'Общий доход', value: `${stats.revenue.toLocaleString('ru')} ₽`, icon: <TrendingUp className="w-5 h-5" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-muted-foreground mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-primary">{loading ? '...' : stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="hotels">Отели</TabsTrigger>
          <TabsTrigger value="content">Контент</TabsTrigger>
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <Card key={u.id} className={cn(!u.is_active && 'opacity-60')}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                      {u.full_name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{u.full_name || u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{roleLabel(u.role)}</Badge>
                    <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {u.is_active ? 'Активен' : 'Заблок.'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserBlock(u.id, u.is_active)}
                      className="h-7 text-xs shrink-0"
                    >
                      {u.is_active ? 'Заблокировать' : 'Разблокировать'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hotels">
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-2">
              {hotels.map(h => (
                <Card key={h.id} className={cn(!h.is_active && 'opacity-60')}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-muted-foreground p-1 bg-secondary rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{h.city} · {h.email}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(h.stars)].map((_: any, i: number) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                    </div>
                    {h.is_verified && (
                      <Badge className="text-xs bg-green-600 text-white">Верифицирован</Badge>
                    )}
                    <Badge variant={h.is_active ? 'default' : 'secondary'} className="text-xs">
                      {h.is_active ? 'Активен' : 'Скрыт'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleHotelVerified(h.id, !!h.is_verified)}
                      className={cn('h-7 text-xs', h.is_verified ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300')}
                    >
                      {h.is_verified ? 'Снять верификацию' : 'Верифицировать'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleHotelActive(h.id, h.is_active)} className="h-7 text-xs">
                      {h.is_active ? 'Скрыть' : 'Активировать'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="content">
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Постов нет</div>
          ) : (
            <div className="space-y-3">
              {posts.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {p.influencer_profiles?.first_name} {p.influencer_profiles?.last_name} · {new Date(p.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Badge variant={p.status === 'published' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs text-center">
                        {p.status === 'published' ? 'Опубликован' : p.status === 'rejected' ? 'Отклонён' : 'Черновик'}
                      </Badge>
                      {p.status !== 'published' && (
                        <Button size="sm" variant="outline" onClick={() => moderatePost(p.id, 'published')} className="h-7 text-xs">
                          <Check className="w-3 h-3 mr-1" /> Одобрить
                        </Button>
                      )}
                      {p.status !== 'rejected' && (
                        <Button size="sm" variant="outline" onClick={() => moderatePost(p.id, 'rejected')} className="h-7 text-xs text-destructive">
                          <X className="w-3 h-3 mr-1" /> Отклонить
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings">
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-muted-foreground p-1 bg-secondary rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{b.profiles?.full_name} → {b.hotel_profiles?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(b.check_in_date).toLocaleDateString('ru-RU')} — {new Date(b.check_out_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{b.final_price.toLocaleString('ru')} ₽</div>
                    <Badge variant={
                      b.status === 'confirmed' ? 'default' :
                      b.status === 'completed' ? 'outline' :
                      b.status === 'cancelled' ? 'destructive' : 'secondary'
                    } className="text-xs">
                      {b.status === 'confirmed' ? 'Подтверждено' :
                       b.status === 'completed' ? 'Завершено' :
                       b.status === 'cancelled' ? 'Отменено' : 'Ожидает'}
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
