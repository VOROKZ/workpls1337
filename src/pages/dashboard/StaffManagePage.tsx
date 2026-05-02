import { useState, useEffect } from 'react'
import { Users, Plus, Mail, Check, X, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelStaff, StaffRole } from '@/lib/database.types'
import { toast } from 'sonner'

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  receptionist: 'Ресепшн',
  cleaner: 'Горничная',
  maintenance: 'Техслужба',
}

const ROLE_COLORS: Record<StaffRole, string> = {
  owner: 'text-primary bg-primary/10',
  manager: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30',
  receptionist: 'text-green-700 bg-green-50 dark:bg-green-950/30',
  cleaner: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30',
  maintenance: 'text-orange-700 bg-orange-50 dark:bg-orange-950/30',
}

interface StaffWithProfile extends HotelStaff {
  profiles: { full_name: string | null; email: string }
}

export default function StaffManagePage() {
  const { hotelProfile } = useAuthStore()
  const [staff, setStaff] = useState<StaffWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<StaffRole>('receptionist')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (hotelProfile) fetchStaff()
  }, [hotelProfile])

  const fetchStaff = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_staff')
      .select('*, profiles(full_name, email)')
      .eq('hotel_id', hotelProfile!.id)
      .order('created_at')
    setStaff((data as StaffWithProfile[]) ?? [])
    setLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', inviteEmail.trim())
      .maybeSingle()

    if (!profile) {
      toast.error('Пользователь с таким email не найден. Попросите его зарегистрироваться как "Сотрудник отеля".')
      setInviting(false)
      return
    }

    const { error } = await supabase.from('hotel_staff').insert({
      hotel_id: hotelProfile!.id,
      user_id: profile.id,
      role_in_hotel: inviteRole,
      is_active: true,
    })

    if (error) {
      if (error.code === '23505') toast.error('Этот сотрудник уже добавлен')
      else toast.error('Ошибка добавления сотрудника')
    } else {
      toast.success('Сотрудник добавлен!')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('receptionist')
      fetchStaff()
    }
    setInviting(false)
  }

  const toggleActive = async (staffId: string, current: boolean) => {
    const { error } = await supabase
      .from('hotel_staff')
      .update({ is_active: !current })
      .eq('id', staffId)
    if (!error) {
      toast.success(current ? 'Сотрудник деактивирован' : 'Сотрудник активирован')
      setStaff(prev => prev.map(s => s.id === staffId ? { ...s, is_active: !current } : s))
    }
  }

  const changeRole = async (staffId: string, role: StaffRole) => {
    const { error } = await supabase
      .from('hotel_staff')
      .update({ role_in_hotel: role })
      .eq('id', staffId)
    if (!error) {
      toast.success('Роль изменена')
      setStaff(prev => prev.map(s => s.id === staffId ? { ...s, role_in_hotel: role } : s))
    }
  }

  if (!hotelProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Профиль отеля не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Управление сотрудниками</h1>
          <p className="text-muted-foreground text-sm mt-1">{hotelProfile.name}</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 w-4 h-4" /> Добавить сотрудника
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить сотрудника</DialogTitle>
              <DialogDescription>
                Введите email пользователя, зарегистрированного на HotelHub
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="staffEmail">Email сотрудника</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="staffEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as StaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_LABELS) as [StaffRole, string][])
                      .filter(([r]) => r !== 'owner')
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Отмена</Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? 'Добавление...' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([role, label]) => {
          const count = staff.filter(s => s.role_in_hotel === role && s.is_active).length
          return (
            <Card key={role}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-4">Сотрудников пока нет</p>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 w-4 h-4" /> Добавить первого сотрудника
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map(s => (
            <Card key={s.id} className={s.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
                    {(s.profiles?.full_name || s.profiles?.email || 'S').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.profiles?.full_name || 'Без имени'}</span>
                      {s.role_in_hotel === 'owner' && (
                        <ShieldCheck className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{s.profiles?.email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.role_in_hotel === 'owner' ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS.owner}`}>
                        {ROLE_LABELS.owner}
                      </span>
                    ) : (
                      <Select
                        value={s.role_in_hotel}
                        onValueChange={(v) => changeRole(s.id, v as StaffRole)}
                      >
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(ROLE_LABELS) as [StaffRole, string][])
                            .filter(([r]) => r !== 'owner')
                            .map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-xs">
                      {s.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                    {s.role_in_hotel !== 'owner' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8"
                        onClick={() => toggleActive(s.id, s.is_active)}
                        title={s.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        {s.is_active ? <X className="w-4 h-4 text-destructive" /> : <Check className="w-4 h-4 text-green-600" />}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
