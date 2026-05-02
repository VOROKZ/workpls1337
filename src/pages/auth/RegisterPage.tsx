import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, User, Star, Building2, Eye, EyeOff, Loader as Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/database.types'

type RoleOption = {
  value: UserRole
  label: string
  description: string
  icon: React.ReactNode
}

const roles: RoleOption[] = [
  {
    value: 'tourist',
    label: 'Турист',
    description: 'Бронируйте отели и находите попутчиков',
    icon: <User className="w-6 h-6" />,
  },
  {
    value: 'hotel',
    label: 'Отель',
    description: 'Управляйте бронированиями и инфлюенсерами',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    value: 'influencer',
    label: 'Инфлюенсер',
    description: 'Создавайте обзоры и зарабатывайте баллы',
    icon: <Star className="w-6 h-6" />,
  },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const fetchProfile = useAuthStore(s => s.fetchProfile)

  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Tourist fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')

  // Hotel fields
  const [hotelName, setHotelName] = useState('')
  const [hotelCity, setHotelCity] = useState('')
  const [hotelAddress, setHotelAddress] = useState('')
  const [hotelPhone, setHotelPhone] = useState('')
  const [hotelEmail, setHotelEmail] = useState('')
  const [hotelDescription, setHotelDescription] = useState('')

  // Influencer fields
  const [infFirstName, setInfFirstName] = useState('')
  const [infLastName, setInfLastName] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [followersCount, setFollowersCount] = useState('')
  const [portfolioText, setPortfolioText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error || !data.user) {
      toast.error(error?.message === 'User already registered' ? 'Email уже используется' : 'Ошибка регистрации')
      setLoading(false)
      return
    }

    const userId = data.user.id

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      role: selectedRole,
      full_name: selectedRole === 'tourist'
        ? `${firstName} ${lastName}`
        : selectedRole === 'influencer'
        ? `${infFirstName} ${infLastName}`
        : hotelName,
    })

    if (profileError) {
      toast.error('Ошибка создания профиля')
      setLoading(false)
      return
    }

    // Create role-specific profile
    if (selectedRole === 'tourist') {
      await supabase.from('tourist_profiles').insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      })
    } else if (selectedRole === 'hotel') {
      const { data: hotelData } = await supabase.from('hotel_profiles').insert({
        user_id: userId,
        name: hotelName,
        city: hotelCity,
        address: hotelAddress,
        phone: hotelPhone,
        email: hotelEmail || email,
        description: hotelDescription || null,
      }).select('id').maybeSingle()

      if (hotelData?.id) {
        await supabase.from('hotel_staff').insert({
          hotel_id: hotelData.id,
          user_id: userId,
          role_in_hotel: 'owner',
          is_active: true,
        })
      }
    } else if (selectedRole === 'influencer') {
      await supabase.from('influencer_profiles').insert({
        user_id: userId,
        first_name: infFirstName,
        last_name: infLastName,
        instagram_url: instagramUrl || null,
        telegram_url: telegramUrl || null,
        followers_count: parseInt(followersCount) || 0,
        portfolio_text: portfolioText || null,
      })
    }

    await fetchProfile()
    toast.success('Аккаунт создан! Добро пожаловать в HotelHub')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg page-enter">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Hotel className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">HotelHub</span>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Регистрация</CardTitle>
            <CardDescription className="text-center">
              {step === 1 && 'Выберите тип аккаунта'}
              {step === 2 && 'Данные для входа'}
              {step === 3 && 'Информация профиля'}
            </CardDescription>
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-200',
                  s < step ? 'bg-primary text-primary-foreground' : s === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'
                )}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {step === 1 && (
              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200',
                      selectedRole === role.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg transition-colors',
                      selectedRole === role.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {role.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{role.label}</div>
                      <div className="text-sm text-muted-foreground">{role.description}</div>
                    </div>
                    {selectedRole === role.value && (
                      <Check className="ml-auto w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
                <Button
                  className="w-full mt-4"
                  onClick={() => setStep(2)}
                  disabled={!selectedRole}
                >
                  Продолжить <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(3) }}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль * (минимум 8 символов)</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="mr-2 w-4 h-4" /> Назад
                  </Button>
                  <Button type="submit" className="flex-1">
                    Далее <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {selectedRole === 'tourist' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Имя *</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Иван" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Фамилия *</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Иванов" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон (опционально)</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 000 00 00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Дата рождения (опционально)</Label>
                      <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                    </div>
                  </>
                )}

                {selectedRole === 'hotel' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="hotelName">Название отеля *</Label>
                      <Input id="hotelName" value={hotelName} onChange={(e) => setHotelName(e.target.value)} required placeholder="Отель Москва" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hotelCity">Город *</Label>
                        <Input id="hotelCity" value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} required placeholder="Москва" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hotelPhone">Телефон *</Label>
                        <Input id="hotelPhone" value={hotelPhone} onChange={(e) => setHotelPhone(e.target.value)} required placeholder="+7 495 000 00 00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotelAddress">Адрес *</Label>
                      <Input id="hotelAddress" value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} required placeholder="ул. Тверская, 1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotelEmail">Email отеля</Label>
                      <Input id="hotelEmail" type="email" value={hotelEmail} onChange={(e) => setHotelEmail(e.target.value)} placeholder="hotel@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotelDesc">Краткое описание</Label>
                      <Input id="hotelDesc" value={hotelDescription} onChange={(e) => setHotelDescription(e.target.value)} placeholder="Уютный отель в центре города..." />
                    </div>
                  </>
                )}

                {selectedRole === 'influencer' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="infFirst">Имя *</Label>
                        <Input id="infFirst" value={infFirstName} onChange={(e) => setInfFirstName(e.target.value)} required placeholder="Анна" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="infLast">Фамилия *</Label>
                        <Input id="infLast" value={infLastName} onChange={(e) => setInfLastName(e.target.value)} required placeholder="Смирнова" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram (ссылка)</Label>
                      <Input id="instagram" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/username" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegram">Telegram-канал (ссылка)</Label>
                      <Input id="telegram" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/channel" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followers">Количество подписчиков *</Label>
                      <Input id="followers" type="number" value={followersCount} onChange={(e) => setFollowersCount(e.target.value)} required placeholder="10000" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Портфолио / опыт (опционально)</Label>
                      <Input id="portfolio" value={portfolioText} onChange={(e) => setPortfolioText(e.target.value)} placeholder="Путешествую по России уже 5 лет..." />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={loading}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Назад
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Создать аккаунт
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Войти
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
