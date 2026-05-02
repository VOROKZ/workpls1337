import { useState, useEffect } from 'react'
import { Check, Wrench, Sparkles, Plus, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelTask } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочно'
}
const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  normal: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  urgent: 'text-red-600 bg-red-50 dark:bg-red-950/30',
}

interface TaskWithRoom extends HotelTask {
  rooms: { name: string } | null
}

export default function TasksPage() {
  const { staffRecords } = useAuthStore()
  const [tasks, setTasks] = useState<TaskWithRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHotelId, setSelectedHotelId] = useState(staffRecords[0]?.hotel_id || '')
  const [filterType, setFilterType] = useState<'all' | 'housekeeping' | 'maintenance'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState<'housekeeping' | 'maintenance' | 'inspection'>('housekeeping')
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [creating, setCreating] = useState(false)

  const staffRecord = staffRecords.find(s => s.hotel_id === selectedHotelId)
  const canCreate = staffRecord?.role_in_hotel === 'owner' || staffRecord?.role_in_hotel === 'manager' || staffRecord?.role_in_hotel === 'receptionist'

  useEffect(() => {
    if (selectedHotelId) fetchTasks()
  }, [selectedHotelId])

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_tasks')
      .select('*, rooms(name)')
      .eq('hotel_id', selectedHotelId)
      .neq('status', 'completed')
      .order('priority')
    setTasks((data as TaskWithRoom[]) ?? [])
    setLoading(false)
  }

  const completeTask = async (id: string) => {
    const { error } = await supabase.from('hotel_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) {
      toast.success('Задание выполнено!')
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  const createTask = async () => {
    if (!newTitle.trim() || !staffRecord) return
    setCreating(true)
    const { error } = await supabase.from('hotel_tasks').insert({
      hotel_id: selectedHotelId,
      task_type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      priority: newPriority,
      status: 'pending',
      created_by: staffRecord.id,
    })
    if (error) {
      toast.error('Ошибка создания задания')
    } else {
      toast.success('Задание создано')
      setCreateOpen(false)
      setNewTitle('')
      setNewDesc('')
      fetchTasks()
    }
    setCreating(false)
  }

  const filtered = tasks.filter(t => filterType === 'all' || t.task_type === filterType)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Задания</h1>
          <p className="text-muted-foreground text-sm mt-1">Текущие задачи по уборке и техническому обслуживанию</p>
        </div>
        <div className="flex items-center gap-2">
          {staffRecords.length > 1 && (
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffRecords.map(s => (
                  <SelectItem key={s.hotel_id} value={s.hotel_id}>
                    Отель {s.hotel_id.slice(0, 6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 w-4 h-4" /> Новое задание</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать задание</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Название</Label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Уборка номера 205" />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание (опционально)</Label>
                    <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Дополнительные детали..." className="resize-none" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="housekeeping">Уборка</SelectItem>
                          <SelectItem value="maintenance">Техслужба</SelectItem>
                          <SelectItem value="inspection">Проверка</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Приоритет</Label>
                      <Select value={newPriority} onValueChange={(v) => setNewPriority(v as typeof newPriority)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Низкий</SelectItem>
                          <SelectItem value="normal">Обычный</SelectItem>
                          <SelectItem value="high">Высокий</SelectItem>
                          <SelectItem value="urgent">Срочно</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
                  <Button onClick={createTask} disabled={creating || !newTitle.trim()}>
                    {creating ? 'Создание...' : 'Создать'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit mb-6">
        {[
          { id: 'all' as const, label: 'Все' },
          { id: 'housekeeping' as const, label: 'Уборка' },
          { id: 'maintenance' as const, label: 'Техслужба' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              filterType === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Активных заданий нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      task.task_type === 'housekeeping' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40' :
                      task.task_type === 'maintenance' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/40' :
                      'bg-blue-100 text-blue-600 dark:bg-blue-950/40'
                    )}>
                      {task.task_type === 'housekeeping' ? <Sparkles className="w-4 h-4" /> :
                       task.task_type === 'maintenance' ? <Wrench className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.rooms && (
                        <div className="text-sm text-muted-foreground">Номер: {task.rooms.name}</div>
                      )}
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLOR[task.priority])}>
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {task.task_type === 'housekeeping' ? 'Уборка' : task.task_type === 'maintenance' ? 'Техслужба' : 'Проверка'}
                        </Badge>
                      </div>
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
    </div>
  )
}
