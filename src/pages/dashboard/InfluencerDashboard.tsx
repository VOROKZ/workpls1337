import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Star, TrendingUp, Link2, FileText, Award, Plus,
  ExternalLink, Building2, Check, Gift
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { AmbassadorApplication, ReferralLink, BlogPost, PointsHistory } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ApplicationWithHotel extends AmbassadorApplication {
  hotel_profiles: { name: string; city: string }
}
interface ReferralWithHotel extends ReferralLink {
  hotel_profiles: { name: string; city: string }
}

export default function InfluencerDashboard() {
  const { influencerProfile } = useAuthStore()
  const [applications, setApplications] = useState<ApplicationWithHotel[]>([])
  const [referrals, setReferrals] = useState<ReferralWithHotel[]>([])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingHotelId, setApplyingHotelId] = useState<string | null>(null)

  useEffect(() => {
    if (influencerProfile) fetchData()
  }, [influencerProfile])

  const fetchData = async () => {
    setLoading(true)
    const [appRes, refRes, postsRes, pointsRes, hotelsRes] = await Promise.all([
      supabase.from('ambassador_applications').select('*, hotel_profiles(name, city)').eq('influencer_id', influencerProfile!.id),
      supabase.from('referral_links').select('*, hotel_profiles(name, city)').eq('influencer_id', influencerProfile!.id),
      supabase.from('blog_posts').select('*').eq('influencer_id', influencerProfile!.id).order('created_at', { ascending: false }),
      supabase.from('points_history').select('*').eq('influencer_id', influencerProfile!.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('hotel_profiles').select('*').eq('is_active', true).limit(12),
    ])
    setApplications((appRes.data as ApplicationWithHotel[]) ?? [])
    setReferrals((refRes.data as ReferralWithHotel[]) ?? [])
    setPosts(postsRes.data ?? [])
    setPointsHistory(pointsRes.data ?? [])
    setHotels(hotelsRes.data ?? [])
    setLoading(false)
  }

  const applyForAmbassador = async (hotelId: string) => {
    if (!influencerProfile) return
    setApplyingHotelId(hotelId)
    const { error } = await supabase.from('ambassador_applications').insert({
      influencer_id: influencerProfile.id,
      hotel_id: hotelId,
      message: 'Хочу стать амбассадором вашего отеля и создать обзор для моей аудитории.',
    })
    if (error) {
      toast.error(error.code === '23505' ? 'Вы уже подали заявку в этот отель' : 'Ошибка при отправке заявки')
    } else {
      toast.success('Заявка отправлена!')
      fetchData()
    }
    setApplyingHotelId(null)
  }

  const generateReferralLink = async (hotelId: string) => {
    if (!influencerProfile) return
    const code = `${influencerProfile.id.slice(0, 6)}-${hotelId.slice(0, 6)}-${Date.now().toString(36)}`.toUpperCase()
    const { error } = await supabase.from('referral_links').insert({
      influencer_id: influencerProfile.id,
      hotel_id: hotelId,
      code,
      discount_percent: 5,
    })
    if (!error) {
      toast.success('Реферальная ссылка создана!')
      fetchData()
    } else {
      toast.error('Ссылка уже существует')
    }
  }

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/hotels?ref=${code}`
    navigator.clipboard.writeText(url)
    toast.success('Ссылка скопирована!')
  }

  const totalClicks = referrals.reduce((s, r) => s + r.clicks_count, 0)
  const totalConversions = referrals.reduce((s, r) => s + r.conversions_count, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{influencerProfile?.first_name} {influencerProfile?.last_name}</h1>
          <p className="text-muted-foreground">{influencerProfile?.followers_count?.toLocaleString('ru')} подписчиков</p>
        </div>
        {influencerProfile?.instagram_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={influencerProfile.instagram_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 w-4 h-4" /> Instagram
            </a>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Баллов', value: influencerProfile?.points_balance || 0, icon: <Award className="w-5 h-5 text-amber-500" /> },
          { label: 'Переходов', value: totalClicks, icon: <TrendingUp className="w-5 h-5 text-primary" /> },
          { label: 'Конверсий', value: totalConversions, icon: <Check className="w-5 h-5 text-green-600" /> },
          { label: 'Постов', value: posts.length, icon: <FileText className="w-5 h-5 text-blue-500" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              {stat.icon}
              <div className="text-2xl font-bold mt-2">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Points redemption */}
      {(influencerProfile?.points_balance || 0) >= 1000 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-amber-500" />
              <div>
                <div className="font-semibold">У вас {influencerProfile?.points_balance} баллов!</div>
                <div className="text-sm text-muted-foreground">1000 баллов = 1 бесплатная ночь</div>
              </div>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
              Потратить баллы
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="hotels">
        <TabsList className="mb-4">
          <TabsTrigger value="hotels">Отели ({hotels.length})</TabsTrigger>
          <TabsTrigger value="applications">Заявки ({applications.length})</TabsTrigger>
          <TabsTrigger value="referrals">Реф. ссылки ({referrals.length})</TabsTrigger>
          <TabsTrigger value="posts">Блог ({posts.length})</TabsTrigger>
          <TabsTrigger value="points">Баллы</TabsTrigger>
        </TabsList>

        <TabsContent value="hotels">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Подайте заявку на амбассадорство и получите уникальную реферальную ссылку</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hotels.map(hotel => {
                const existingApp = applications.find(a => a.hotel_id === hotel.id)
                const existingRef = referrals.find(r => r.hotel_id === hotel.id)
                return (
                  <Card key={hotel.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="font-medium">{hotel.name}</div>
                          <div className="text-sm text-muted-foreground">{hotel.city}</div>
                        </div>
                        {[...Array(hotel.stars)].map((_: any, i: number) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {!existingApp ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyForAmbassador(hotel.id)}
                            disabled={applyingHotelId === hotel.id}
                            className="h-7 text-xs"
                          >
                            {applyingHotelId === hotel.id ? 'Отправляем...' : 'Подать заявку'}
                          </Button>
                        ) : (
                          <Badge variant={
                            existingApp.status === 'pending' ? 'secondary' :
                            existingApp.status === 'approved' ? 'default' : 'destructive'
                          } className="text-xs">
                            {existingApp.status === 'pending' ? 'Заявка отправлена' :
                             existingApp.status === 'approved' ? 'Одобрено' :
                             existingApp.status === 'rejected' ? 'Отклонено' : 'Завершено'}
                          </Badge>
                        )}
                        {existingApp?.status === 'approved' && !existingRef && (
                          <Button size="sm" onClick={() => generateReferralLink(hotel.id)} className="h-7 text-xs">
                            <Link2 className="mr-1 w-3 h-3" /> Создать ссылку
                          </Button>
                        )}
                        {existingRef && (
                          <Button size="sm" variant="outline" onClick={() => copyLink(existingRef.code)} className="h-7 text-xs">
                            <Link2 className="mr-1 w-3 h-3" /> Скопировать ссылку
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications">
          {applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Заявок пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{app.hotel_profiles?.name}</div>
                      <div className="text-sm text-muted-foreground">{app.hotel_profiles?.city}</div>
                      {app.hotel_response && (
                        <p className="text-sm mt-1 text-muted-foreground italic">"{app.hotel_response}"</p>
                      )}
                    </div>
                    <Badge variant={
                      app.status === 'pending' ? 'secondary' :
                      app.status === 'approved' ? 'default' :
                      app.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {app.status === 'pending' ? 'Рассматривается' :
                       app.status === 'approved' ? 'Одобрено' :
                       app.status === 'rejected' ? 'Отклонено' : 'Завершено'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals">
          {referrals.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Link2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Получите одобрение от отеля, чтобы создать реферальную ссылку</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map(ref => (
                <Card key={ref.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="font-medium">{ref.hotel_profiles?.name}</div>
                        <div className="text-sm text-muted-foreground">Скидка туристу: {ref.discount_percent}%</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyLink(ref.code)} className="h-7 text-xs">
                        Скопировать
                      </Button>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{ref.clicks_count} переходов</span>
                      <span>{ref.conversions_count} бронирований</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                      {window.location.origin}/hotels?ref={ref.code}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts">
          <div className="flex justify-end mb-4">
            <Button size="sm" asChild>
              <Link to="/dashboard/blog/new"><Plus className="mr-2 w-4 h-4" /> Новый пост</Link>
            </Button>
          </div>
          {posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="mb-4">Публикаций пока нет</p>
              <Button asChild size="sm">
                <Link to="/dashboard/blog/new"><Plus className="mr-2 w-4 h-4" /> Написать пост</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <Link key={post.id} to={`/dashboard/blog/${post.id}`}>
                  <Card className="hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{post.title}</div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                          <span>{post.likes_count} лайков</span>
                          <span>{post.comments_count} комментариев</span>
                          <span>{new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {post.status === 'published' ? 'Опубликован' : 'Черновик'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="points">
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="text-2xl font-bold text-amber-600">{influencerProfile?.points_balance || 0} баллов</div>
            <div className="text-sm text-muted-foreground mt-1">1000 баллов = 1 бесплатная ночь</div>
          </div>
          {pointsHistory.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>История операций пуста</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pointsHistory.map(ph => (
                <div key={ph.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-medium">{ph.description || ph.source}</div>
                    <div className="text-xs text-muted-foreground">{new Date(ph.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <div className={cn('font-semibold', ph.type === 'earned' ? 'text-green-600' : 'text-red-600')}>
                    {ph.type === 'earned' ? '+' : '-'}{ph.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
