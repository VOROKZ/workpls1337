import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, Star, Search, Building2, ChevronRight, X, ListFilter as Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import type { HotelProfile } from '@/lib/database.types'
import { cn } from '@/lib/utils'

const RUSSIAN_CITIES = [
  'Москва', 'Санкт-Петербург', 'Казань', 'Сочи', 'Екатеринбург',
  'Новосибирск', 'Нижний Новгород', 'Краснодар', 'Уфа', 'Самара',
  'Ростов-на-Дону', 'Владивосток', 'Красноярск', 'Ярославль', 'Суздаль'
]

export default function HotelsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hotels, setHotels] = useState<HotelProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('city') || '')
  const [sortBy, setSortBy] = useState('rating')
  const [minStars, setMinStars] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    fetchHotels()
  }, [searchQuery, sortBy, minStars])

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = RUSSIAN_CITIES.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [searchQuery])

  const fetchHotels = async () => {
    setLoading(true)
    let query = supabase.from('hotel_profiles').select('*').eq('is_active', true).gte('stars', minStars)

    if (searchQuery) {
      query = query.ilike('city', `%${searchQuery}%`)
    }

    if (sortBy === 'rating') query = query.order('rating', { ascending: false })
    else if (sortBy === 'name') query = query.order('name')
    else if (sortBy === 'newest') query = query.order('created_at', { ascending: false })

    const { data } = await query.limit(24)
    setHotels(data ?? [])
    setLoading(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchParams({})
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Отели России</h1>
        <p className="text-muted-foreground">Найдите идеальное место для отдыха</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по городу..."
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              {suggestions.map((city) => (
                <button
                  key={city}
                  onClick={() => { setSearchQuery(city); setSuggestions([]) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                >
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">По рейтингу</SelectItem>
            <SelectItem value="name">По названию</SelectItem>
            <SelectItem value="newest">Новые сначала</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'border-primary text-primary')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Минимум звёзд:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinStars(s)}
                    className={cn('transition-colors', s <= minStars ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-300')}
                  >
                    <Star className={cn('w-5 h-5', s <= minStars ? 'fill-amber-400' : '')} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <div className="mb-4 text-sm text-muted-foreground">
          Найдено {hotels.length} {hotels.length === 1 ? 'отель' : hotels.length < 5 ? 'отеля' : 'отелей'}
          {searchQuery && ` в городе "${searchQuery}"`}
        </div>
      )}

      {/* Hotel grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Отели не найдены</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchQuery ? `В городе "${searchQuery}" пока нет отелей` : 'Попробуйте изменить фильтры'}
          </p>
          {searchQuery && <Button variant="outline" onClick={clearSearch}>Сбросить поиск</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <Link key={hotel.id} to={`/hotels/${hotel.id}`}>
              <Card className="hotel-card overflow-hidden cursor-pointer border-border h-full">
                <div className="h-48 bg-gradient-to-br from-beige to-secondary flex items-center justify-center relative overflow-hidden">
                  <Building2 className="w-16 h-16 text-muted-foreground/30" />
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="text-xs">
                      {hotel.city}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex">
                    {[...Array(hotel.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{hotel.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{hotel.address}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">{hotel.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({hotel.reviews_count} отзывов)</span>
                  </div>
                  {hotel.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{hotel.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    {hotel.accepts_points && (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30">
                        Принимает баллы
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" className="ml-auto h-7 text-xs">
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
  )
}
