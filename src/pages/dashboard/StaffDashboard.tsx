import { useState, useEffect } from 'react'
import { Check, Wrench, Sparkles, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelTask } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TASK_PRIORITY: Record<string, string> = {
  low: 'text-blue-600 bg-blue-50',
  normal: 'text-gray-600 bg-gray-100',
  high: 'text-orange-600 bg-orange-50',
  urgent: 'text-red-600 bg-red-50',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочно'
}

interface TaskWithRoom extends HotelTask {
  rooms: { name: string } | null
}

interface BookingForStaff {
  id: string
  tourist_first_name: string
  tourist_last_name: string
  check_in_date: string
  check_out_date: string
  rooms: { name: string }
  status: string
}

export default function StaffDashboard() {
  const { staffRecords } = useAuthStore()
  const [tasks, setTasks] = useState<TaskWithRoom[]>([])
  const [bookings, setBookings] = useState<BookingForStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHotelId, setSelectedHotelId] = useState(staffRecords[0]?.hotel_id || '')
  const staffRecord = staffRecords.find(s => s.hotel_id === selectedHotelId)
  const role = staffRecord?.role_in_hotel || 'receptionist'

  useEffect(() => {
    if (selectedHotelId) fetchData()
  }, [selectedHotelId])

  const fetchData = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [tasksRes, bookingsRes] = await Promise.all([
      supabase.from('hotel_tasks').select('*, rooms(name)').eq('hotel_id', selectedHotelId).neq('status', 'completed').order('priority'),
      supabase.from('bookings').select('*, rooms(name)').eq('hotel_id', selectedHotelId)
        .in('status', ['confirmed', 'pending'])
        .or(`check_in_date.eq.${today},check_out_date.eq.${today}`)
        .order('check_in_date'),
    ])
    setTasks((tasksRes.data as TaskWithRoom[]) ?? [])
    setBookings((bookingsRes.data as BookingForStaff[]) ?? [])
    setLoading(false)
  }

  const completeTask = async (taskId: string) => {
    const { error } = await supabase.from('hotel_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
    if (!error) {
      toast.success('Задание выполнено!')
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }
  }

  const checkInGuest = async (bookingId: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    if (!error) {
      toast.success('Гость заселён!')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
    }
  }

  const checkOutGuest = async (bookingId: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)
    if (!error) {
      toast.success('Гость выселен!')
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const checkIns = bookings.filter(b => b.check_in_date === today)
  const checkOuts = bookings.filter(b => b.check_out_date === today)
  const myTasks = tasks.filter(t => role === 'cleaner' ? t.task_type === 'housekeeping' : role === 'maintenance' ? t.task_type === 'maintenance' : true)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Рабочий стол</h1>
          <p className="text-muted-foreground">
            {role === 'owner' ? 'Владелец' :
             role === 'manager' ? 'Менеджер' :
             role === 'receptionist' ? 'Администратор ресепшн' :
             role === 'cleaner' ? 'Горничная/Уборщик' : 'Техслужба'}
          </p>
        </div>
        {staffRecords.length > 1 && (
          <div className="flex gap-2">
            {staffRecords.map(s => (
              <Button
                key={s.hotel_id}
                size="sm"
                variant={selectedHotelId === s.hotel_id ? 'default' : 'outline'}
                onClick={() => setSelectedHotelId(s.hotel_id)}
              >
                Отель {s.hotel_id.slice(0, 6)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Today summary */}
      {(role === 'receptionist' || role === 'manager' || role === 'owner') && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{checkIns.length}</div>
              <div className="text-sm text-green-700/70">Заездов сегодня</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{checkOuts.length}</div>
              <div className="text-sm text-blue-700/70">Выездов сегодня</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue={role === 'cleaner' || role === 'maintenance' ? 'tasks' : 'checkins'}>
        <TabsList className="mb-4">
          {(role === 'receptionist' || role === 'manager' || role === 'owner') && (
            <>
              <TabsTrigger value="checkins">Заезды ({checkIns.length})</TabsTrigger>
              <TabsTrigger value="checkouts">Выезды ({checkOuts.length})</TabsTrigger>
            </>
          )}
          <TabsTrigger value="tasks">Задания ({myTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checkins">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : checkIns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Заездов сегодня нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkIns.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{b.tourist_first_name} {b.tourist_last_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {b.rooms?.name} · {new Date(b.check_in_date).toLocaleDateString('ru-RU')} — {new Date(b.check_out_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => checkInGuest(b.id)} className="bg-green-600 hover:bg-green-700">
                      <Check className="mr-1 w-4 h-4" /> Заселить
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkouts">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : checkOuts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Выездов сегодня нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkOuts.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{b.tourist_first_name} {b.tourist_last_name}</div>
                      <div className="text-sm text-muted-foreground">{b.rooms?.name}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => checkOutGuest(b.id)}>
                      Выселить
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Check className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Заданий нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.map(task => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-1.5 rounded-lg', task.task_type === 'housekeeping' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600')}>
                          {task.task_type === 'housekeeping' ? <Sparkles className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          {task.rooms && <div className="text-sm text-muted-foreground">Номер: {task.rooms.name}</div>}
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block', TASK_PRIORITY[task.priority])}>
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => completeTask(task.id)} className="shrink-0">
                        <Check className="mr-1 w-3.5 h-3.5" /> Готово
                      </Button>
                    </div>
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
