import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, Star, Shield, MessageSquare,
  ArrowRight, ChevronRight, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelProfile } from '@/lib/database.types'
import { cn } from '@/lib/utils'

const RUSSIAN_CITIES = [
  'Москва', 'Санкт-Петербург', 'Казань', 'Сочи', 'Екатеринбург',
  'Новосибирск', 'Нижний Новгород', 'Краснодар', 'Уфа', 'Самара',
  'Ростов-на-Дону', 'Владивосток', 'Красноярск', 'Ярославль', 'Суздаль'
]


function HotelCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [searchCity, setSearchCity] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hotels, setHotels] = useState<HotelProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ hotels: 0, tourists: 0, influencers: 0 })

  useEffect(() => {
    fetchFeaturedHotels()
    fetchStats()
  }, [])

  useEffect(() => {
    if (searchCity.length > 1) {
      const filtered = RUSSIAN_CITIES.filter(c =>
        c.toLowerCase().includes(searchCity.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchCity])

  const fetchFeaturedHotels = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_profiles')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(6)
    setHotels(data ?? [])
    setLoading(false)
  }

  const fetchStats = async () => {
    const [{ count: h }, { count: t }, { count: i }] = await Promise.all([
      supabase.from('hotel_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('tourist_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('influencer_profiles').select('*', { count: 'exact', head: true }),
    ])
    setStats({ hotels: h ?? 0, tourists: t ?? 0, influencers: i ?? 0 })
  }

  const handleSearch = () => {
    if (searchCity) navigate(`/hotels?city=${encodeURIComponent(searchCity)}`)
    else navigate('/hotels')
  }

  const handleCitySelect = (city: string) => {
    setSearchCity(city)
    setShowSuggestions(false)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-accent via-accent/80 to-primary/20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary" />
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-terracotta" />
          <div className="absolute bottom-20 left-1/3 w-16 h-16 rounded-full bg-primary" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              Платформа для путешествий по России
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Найдите идеальный отель и путешествуйте умнее
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Бронируйте отели, общайтесь с местными инфлюенсерами и находите попутчиков — всё в одном месте
            </p>

            {/* Search bar */}
            <div className="relative max-w-lg mx-auto">
              <div className="flex gap-2 bg-card rounded-2xl shadow-lg p-2 border border-border">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Введите город..."
                    className="pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent text-base"
                  />
                  {showSuggestions && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                      {suggestions.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleSearch} className="gap-2 rounded-xl">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:block">Найти</span>
                </Button>
              </div>
            </div>

            {/* Popular cities */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Москва', 'Сочи', 'Санкт-Петербург', 'Казань', 'Суздаль'].map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="px-3 py-1 rounded-full text-sm bg-card/70 border border-border hover:border-primary hover:text-primary transition-all"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">{stats.hotels}+</div>
              <div className="text-sm text-muted-foreground mt-1">Отелей</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">{stats.tourists}+</div>
              <div className="text-sm text-muted-foreground mt-1">Туристов</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">{stats.influencers}+</div>
              <div className="text-sm text-muted-foreground mt-1">Инфлюенсеров</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hotels */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Популярные отели</h2>
              <p className="text-muted-foreground mt-1">Лучшие предложения на платформе</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hotels">
                Все отели <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <HotelCardSkeleton key={i} />)}
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Отели скоро появятся</h3>
              <p className="text-muted-foreground text-sm mb-4">Станьте первым отелем на платформе</p>
              <Button asChild variant="outline">
                <Link to="/register">Зарегистрировать отель</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <Link key={hotel.id} to={`/hotels/${hotel.id}`}>
                  <Card className="hotel-card overflow-hidden cursor-pointer border-border h-full">
                    <div className="h-48 bg-gradient-to-br from-beige to-secondary flex items-center justify-center overflow-hidden">
                      <Building2 className="w-16 h-16 text-muted-foreground/40" />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground line-clamp-1">{hotel.name}</h3>
                        <div className="flex shrink-0">
                          {[...Array(hotel.stars)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{hotel.city}</span>
                      </div>
                      <StarRating rating={hotel.rating} />
                      {hotel.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{hotel.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">{hotel.reviews_count} отзывов</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Подробнее <ChevronRight className="ml-1 w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Почему HotelHub?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Мы соединяем туристов, отели и инфлюенсеров для лучшего опыта путешествий</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Star className="w-6 h-6" />,
                title: 'Обзоры инфлюенсеров',
                desc: 'Честные обзоры от путешественников с большой аудиторией. Скидки по реферальным ссылкам.',
              },
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: 'Сообщество путешественников',
                desc: 'Чаты по городам, поиск попутчиков, советы от местных. Найдите компанию для экскурсии.',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Безопасное бронирование',
                desc: 'Все отели проверены. История бронирований, статусы, прозрачные цены без скрытых комиссий.',
              },
            ].map((feat) => (
              <div key={feat.title} className="flex flex-col items-start p-6 rounded-2xl border border-border bg-background hover:border-primary/30 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feat.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-16 bg-gradient-to-r from-primary/5 to-accent/30">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Присоединяйтесь к HotelHub</h2>
            <p className="text-muted-foreground mb-8">Туристы, отели и инфлюенсеры — найдите своё место на платформе</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link to="/register">Создать аккаунт <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/hotels">Смотреть отели</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
