import { useState, useEffect } from 'react'
import { Loader as Loader2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, touristProfile, fetchProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const [phone, setPhone] = useState(touristProfile?.phone || '')
  const [dateOfBirth, setDateOfBirth] = useState(touristProfile?.date_of_birth || '')
  const [fullName, setFullName] = useState(user?.full_name || '')

  useEffect(() => {
    if (touristProfile) {
      setPhone(touristProfile.phone || '')
      setDateOfBirth(touristProfile.date_of_birth || '')
    }
    if (user) setFullName(user.full_name || '')
  }, [touristProfile, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user!.id)

    if (user?.role === 'tourist' && touristProfile) {
      await supabase.from('tourist_profiles').update({
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      }).eq('user_id', user.id)
    }

    await fetchProfile()
    toast.success('Настройки сохранены')
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Настройки профиля</h1>

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Основные данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя и фамилия</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            {user?.role === 'tourist' && (
              <>
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
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Сохранить изменения
        </Button>
      </form>
    </div>
  )
}
