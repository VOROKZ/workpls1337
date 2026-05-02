import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, Phone, Mail, Wifi, Car, Coffee, Waves, Dumbbell,
  Utensils, MessageSquare, Users, ChevronLeft, Calendar, Building2,
  Check, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelProfile, Room, HotelAmenity } from '@/lib/database.types'
import { cn } from '@/lib/utils'

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-4 h-4" />,
  'Кофе': <Coffee className="w-4 h-4" />,
  'Парковка': <Car className="w-4 h-4" />,
  'Бассейн': <Waves className="w-4 h-4" />,
  'Спортзал': <Dumbbell className="w-4 h-4" />,
  'Ресторан': <Utensils className="w-4 h-4" />,
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Стандартный',
  deluxe: 'Делюкс',
  suite: 'Люкс',
  economy: 'Эконом',
  family: 'Семейный',
  presidential: 'Президентский',
}

export default function HotelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [hotel, setHotel] = useState<HotelProfile | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [amenities, setAmenities] = useState<HotelAmenity[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchHotelData()
  }, [id])

  const fetchHotelData = async () => {
    setLoading(true)
    const [hotelRes, roomsRes, amenitiesRes, reviewsRes] = await Promise.all([
      supabase.from('hotel_profiles').select('*').eq('id', id!).maybeSingle(),
      supabase.from('rooms').select('*').eq('hotel_id', id!).eq('is_available', true),
      supabase.from('hotel_amenities').select('*').eq('hotel_id', id!),
      supabase.from('hotel_reviews').select('*, profiles(full_name, avatar_url)').eq('hotel_id', id!).eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
    ])
    setHotel(hotelRes.data)
    setRooms(roomsRes.data ?? [])
    setAmenities(amenitiesRes.data ?? [])
    setReviews(reviewsRes.data ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-64 w-full rounded-2xl mb-6" />
        <Skeleton className="h-8 w-1/2 mb-3" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Отель не найден</h2>
        <Button asChild variant="outline">
          <Link to="/hotels"><ChevronLeft className="mr-2 w-4 h-4" /> К списку отелей</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ChevronLeft className="mr-1 w-4 h-4" /> Назад
      </Button>

      {/* Hero */}
      <div className="h-64 md:h-80 bg-gradient-to-br from-beige via-secondary to-accent rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden">
        <Building2 className="w-24 h-24 text-muted-foreground/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            {[...Array(hotel.stars)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{hotel.name}</h1>
          <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
            <MapPin className="w-4 h-4" />
            <span>{hotel.address}, {hotel.city}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList className="mb-4">
              <TabsTrigger value="info">Описание</TabsTrigger>
              <TabsTrigger value="rooms">Номера ({rooms.length})</TabsTrigger>
              <TabsTrigger value="reviews">Отзывы ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              {hotel.description && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                  </CardContent>
                </Card>
              )}
              {amenities.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Удобства</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {amenities.map((amenity) => (
                        <div key={amenity.id} className="flex items-center gap-2 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {AMENITY_ICONS[amenity.name] || <Check className="w-4 h-4" />}
                          </div>
                          <span>{amenity.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rooms">
              {rooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Номера пока не добавлены</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <Card key={room.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{room.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {ROOM_TYPE_LABELS[room.type] || room.type}
                              </Badge>
                            </div>
                            {room.description && (
                              <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> до {room.max_guests} гостей
                              </span>
                              {room.area_sqm && <span>{room.area_sqm} м²</span>}
                              {room.floor && <span>{room.floor} этаж</span>}
                            </div>
                            {room.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {room.amenities.slice(0, 4).map((a) => (
                                  <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-primary">
                              {room.price_per_night.toLocaleString('ru')} ₽
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">за ночь</div>
                            {user ? (
                              <Button size="sm" asChild>
                                <Link to={`/booking?hotel=${hotel.id}&room=${room.id}`}>
                                  Забронировать
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" asChild variant="outline">
                                <Link to="/login">Войти</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Отзывов пока нет</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="text-xs bg-secondary">
                              {review.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{review.profiles?.full_name || 'Турист'}</span>
                              <div className="flex">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                                ))}
                              </div>
                            </div>
                            {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                            <p className="text-sm text-muted-foreground">{review.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(review.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">{hotel.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({hotel.reviews_count} отзывов)</span>
              </div>
              {hotel.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${hotel.phone}`} className="hover:text-primary transition-colors">{hotel.phone}</a>
                </div>
              )}
              {hotel.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${hotel.email}`} className="hover:text-primary transition-colors">{hotel.email}</a>
                </div>
              )}
              <div className="pt-3 space-y-2">
                {user ? (
                  <Button className="w-full" asChild>
                    <Link to={`/booking?hotel=${hotel.id}`}>
                      <Calendar className="mr-2 w-4 h-4" /> Забронировать
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link to="/login">Войти для бронирования</Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/hotels/${hotel.id}/chat`}>
                    <MessageSquare className="mr-2 w-4 h-4" /> Чат с отелем
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {hotel.accepts_points && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Tag className="w-4 h-4" />
                  <span className="font-medium text-sm">Принимает баллы</span>
                </div>
                <p className="text-xs text-muted-foreground">1000 баллов = 1 бесплатная ночь</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
