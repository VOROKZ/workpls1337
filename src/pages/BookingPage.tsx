import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, Tag, Check, Loader as Loader2, ChevronLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelProfile, Room } from '@/lib/database.types'
import { toast } from 'sonner'

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Стандартный',
  deluxe: 'Делюкс',
  suite: 'Люкс',
  economy: 'Эконом',
  family: 'Семейный',
  presidential: 'Президентский',
}

export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, touristProfile } = useAuthStore()

  const hotelId = searchParams.get('hotel')
  const roomId = searchParams.get('room')
  const refCode = searchParams.get('ref')

  const [hotel, setHotel] = useState<HotelProfile | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  // Form fields
  const [selectedRoomId, setSelectedRoomId] = useState(roomId || '')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [firstName, setFirstName] = useState(touristProfile?.first_name || '')
  const [lastName, setLastName] = useState(touristProfile?.last_name || '')
  const [phone, setPhone] = useState(touristProfile?.phone || '')
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState<any>(null)
  const [specialRequests, setSpecialRequests] = useState('')
  const [referralLink, setReferralLink] = useState<any>(null)

  useEffect(() => {
    if (hotelId) fetchData()
  }, [hotelId])

  useEffect(() => {
    if (touristProfile) {
      setFirstName(touristProfile.first_name)
      setLastName(touristProfile.last_name)
      setPhone(touristProfile.phone || '')
    }
  }, [touristProfile])

  useEffect(() => {
    if (selectedRoomId && rooms.length > 0) {
      setRoom(rooms.find(r => r.id === selectedRoomId) || null)
    }
  }, [selectedRoomId, rooms])

  useEffect(() => {
    if (refCode) fetchReferralLink()
  }, [refCode])

  const fetchData = async () => {
    setLoading(true)
    const [hotelRes, roomsRes] = await Promise.all([
      supabase.from('hotel_profiles').select('*').eq('id', hotelId!).maybeSingle(),
      supabase.from('rooms').select('*').eq('hotel_id', hotelId!).eq('is_available', true),
    ])
    setHotel(hotelRes.data)
    setRooms(roomsRes.data ?? [])
    if (roomId) setRoom(roomsRes.data?.find(r => r.id === roomId) ?? null)
    setLoading(false)
  }

  const fetchReferralLink = async () => {
    const { data } = await supabase
      .from('referral_links')
      .select('*, influencer_profiles(first_name, last_name)')
      .eq('code', refCode!)
      .maybeSingle()
    setReferralLink(data)
  }

  const applyPromoCode = async () => {
    if (!promoCode || !hotelId) return
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
    if (!data) {
      toast.error('Промокод не найден или недействителен')
      return
    }
    setPromoData(data)
    toast.success(`Промокод применён: скидка ${data.discount_percent}%`)
  }

  const calculatePrices = () => {
    if (!room || !checkIn || !checkOut) return null
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) return null
    const totalPrice = room.price_per_night * nights
    let discountPercent = 0
    if (promoData) discountPercent += promoData.discount_percent
    if (referralLink) discountPercent += referralLink.discount_percent
    const discountAmount = (totalPrice * discountPercent) / 100
    const finalPrice = totalPrice - discountAmount
    return { nights, totalPrice, discountAmount, finalPrice, discountPercent }
  }

  const prices = calculatePrices()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !hotel || !room || !prices) return
    setSubmitting(true)

    const { data: booking, error } = await supabase.from('bookings').insert({
      tourist_id: user.id,
      hotel_id: hotel.id,
      room_id: room.id,
      check_in_date: checkIn,
      check_out_date: checkOut,
      guests_count: guests,
      base_price_per_night: room.price_per_night,
      total_price: prices.totalPrice,
      discount_amount: prices.discountAmount,
      final_price: prices.finalPrice,
      referral_link_id: referralLink?.id || null,
      promo_code_id: promoData?.id || null,
      status: 'confirmed',
      tourist_first_name: firstName,
      tourist_last_name: lastName,
      tourist_phone: phone || null,
      special_requests: specialRequests || null,
    }).select().single()

    if (error || !booking) {
      toast.error('Не удалось создать бронирование')
      setSubmitting(false)
      return
    }

    setSuccess(booking.id)
    toast.success('Бронирование создано!')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center page-enter">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Бронирование подтверждено!</h2>
        <p className="text-muted-foreground mb-2">Номер бронирования:</p>
        <code className="text-sm bg-muted px-3 py-1.5 rounded-lg font-mono">{success.slice(0, 8).toUpperCase()}</code>
        <div className="flex flex-col gap-3 mt-8">
          <Button asChild>
            <Link to="/dashboard/bookings">Мои бронирования</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">На главную</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ChevronLeft className="mr-1 w-4 h-4" /> Назад
      </Button>

      <h1 className="text-2xl font-bold mb-6">Бронирование</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Hotel info */}
            {hotel && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{hotel.name}</h3>
                      <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Room selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Выбор номера</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      selectedRoomId === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge variant="secondary" className="text-xs">{ROOM_TYPE_LABELS[r.type]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">до {r.max_guests} гостей</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{r.price_per_night.toLocaleString('ru')} ₽/ночь</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Dates and guests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Даты и гости</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkIn">Заезд *</Label>
                    <Input id="checkIn" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOut">Выезд *</Label>
                    <Input id="checkOut" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required min={checkIn || new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests">Количество гостей</Label>
                  <Input id="guests" type="number" min={1} max={room?.max_guests || 10} value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            {/* Guest info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Данные гостя</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fName">Имя *</Label>
                    <Input id="fName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lName">Фамилия *</Label>
                    <Input id="lName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requests">Пожелания</Label>
                  <Input id="requests" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Ранний заезд, высокий этаж..." />
                </div>
              </CardContent>
            </Card>

            {/* Promo code */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Промокод"
                      className="pl-9"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={applyPromoCode}>Применить</Button>
                </div>
                {promoData && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                    <Check className="w-4 h-4" /> Скидка {promoData.discount_percent}% применена
                  </div>
                )}
                {referralLink && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                    <Check className="w-4 h-4" /> Реферальная скидка {referralLink.discount_percent}% от инфлюенсера
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Price summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Итоговая стоимость</CardTitle>
              </CardHeader>
              <CardContent>
                {prices ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{room?.price_per_night.toLocaleString('ru')} ₽ × {prices.nights} ночей</span>
                      <span>{prices.totalPrice.toLocaleString('ru')} ₽</span>
                    </div>
                    {prices.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>Скидка {prices.discountPercent}%</span>
                        <span>-{prices.discountAmount.toLocaleString('ru')} ₽</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Итого</span>
                      <span className="text-primary">{prices.finalPrice.toLocaleString('ru')} ₽</span>
                    </div>
                    <Button type="submit" className="w-full mt-4" disabled={!selectedRoomId || !checkIn || !checkOut || submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Подтвердить бронирование
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Выберите номер и даты
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
