import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Upload, Loader as Loader2, Pencil, Trash2, BedDouble, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Room, RoomType } from '@/lib/database.types'
import { toast } from 'sonner'

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'economy', label: 'Эконом' },
  { value: 'standard', label: 'Стандарт' },
  { value: 'deluxe', label: 'Делюкс' },
  { value: 'family', label: 'Семейный' },
  { value: 'suite', label: 'Люкс' },
  { value: 'presidential', label: 'Президентский' },
]

const AMENITY_PRESETS = [
  'Wi-Fi', 'Кондиционер', 'Телевизор', 'Мини-бар', 'Сейф',
  'Фен', 'Джакузи', 'Балкон', 'Вид на море', 'Вид на горы',
]

interface RoomForm {
  name: string
  type: RoomType
  description: string
  price_per_night: string
  max_guests: string
  area_sqm: string
  floor: string
  amenities: string[]
  photos: string[]
  is_available: boolean
}

const emptyForm = (): RoomForm => ({
  name: '',
  type: 'standard',
  description: '',
  price_per_night: '',
  max_guests: '2',
  area_sqm: '',
  floor: '',
  amenities: [],
  photos: [],
  is_available: true,
})

export default function RoomsManagePage() {
  const { hotelProfile } = useAuthStore()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [amenityInput, setAmenityInput] = useState('')
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hotelProfile) fetchRooms()
  }, [hotelProfile])

  const fetchRooms = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelProfile!.id)
      .order('created_at')
    setRooms(data ?? [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditingRoom(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (room: Room) => {
    setEditingRoom(room)
    setForm({
      name: room.name,
      type: room.type,
      description: room.description || '',
      price_per_night: String(room.price_per_night),
      max_guests: String(room.max_guests),
      area_sqm: room.area_sqm ? String(room.area_sqm) : '',
      floor: room.floor ? String(room.floor) : '',
      amenities: room.amenities ?? [],
      photos: room.photos ?? [],
      is_available: room.is_available,
    })
    setDialogOpen(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !hotelProfile) return
    setUploadingPhoto(true)

    for (const file of files.slice(0, 10 - form.photos.length)) {
      const ext = file.name.split('.').pop()
      const path = `${hotelProfile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from('hotel-images').upload(path, file)
      if (!error && data) {
        const { data: pub } = supabase.storage.from('hotel-images').getPublicUrl(data.path)
        setForm(prev => ({ ...prev, photos: [...prev.photos, pub.publicUrl] }))
      } else {
        toast.error(`Не удалось загрузить ${file.name}`)
      }
    }
    setUploadingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (url: string) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter(p => p !== url) }))
  }

  const toggleAmenityPreset = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }))
  }

  const addCustomAmenity = () => {
    const trimmed = amenityInput.trim()
    if (trimmed && !form.amenities.includes(trimmed)) {
      setForm(prev => ({ ...prev, amenities: [...prev.amenities, trimmed] }))
    }
    setAmenityInput('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Введите название номера'); return }
    if (!form.price_per_night || isNaN(Number(form.price_per_night))) { toast.error('Введите цену'); return }
    if (!hotelProfile) return

    setSaving(true)
    const payload = {
      hotel_id: hotelProfile.id,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || null,
      price_per_night: Number(form.price_per_night),
      max_guests: Number(form.max_guests) || 2,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
      floor: form.floor ? Number(form.floor) : null,
      amenities: form.amenities,
      photos: form.photos,
      is_available: form.is_available,
    }

    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id)
      if (error) { toast.error('Ошибка при сохранении'); setSaving(false); return }
      toast.success('Номер обновлён')
    } else {
      const { error } = await supabase.from('rooms').insert(payload)
      if (error) { toast.error('Ошибка при создании'); setSaving(false); return }
      toast.success('Номер добавлен')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchRooms()
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('Удалить этот номер?')) return
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (!error) {
      toast.success('Номер удалён')
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } else {
      toast.error('Ошибка при удалении')
    }
  }

  const toggleAvailability = async (room: Room) => {
    const { error } = await supabase
      .from('rooms')
      .update({ is_available: !room.is_available })
      .eq('id', room.id)
    if (!error) {
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_available: !r.is_available } : r))
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Управление номерами</h1>
          <p className="text-sm text-muted-foreground">{hotelProfile?.name}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Добавить номер
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-4">Номеров пока нет</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Добавить первый номер
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => {
            const isExpanded = expandedRoom === room.id
            const typeLabel = ROOM_TYPES.find(t => t.value === room.type)?.label ?? room.type
            return (
              <Card key={room.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {room.photos?.[0] ? (
                      <img
                        src={room.photos[0]}
                        alt={room.name}
                        className="w-20 h-16 object-cover rounded-lg shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <BedDouble className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{room.name}</span>
                        <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                        <Badge
                          variant={room.is_available ? 'default' : 'outline'}
                          className="text-xs cursor-pointer"
                          onClick={() => toggleAvailability(room)}
                        >
                          {room.is_available ? 'Доступен' : 'Недоступен'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                        <span>{room.price_per_night.toLocaleString('ru')} ₽/ночь</span>
                        <span>до {room.max_guests} гостей</span>
                        {room.area_sqm && <span>{room.area_sqm} м²</span>}
                        {room.floor && <span>{room.floor} этаж</span>}
                      </div>
                      {room.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, isExpanded ? undefined : 3).map(a => (
                            <span key={a} className="text-xs bg-muted px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                          {!isExpanded && room.amenities.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{room.amenities.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(room)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(room.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {room.description && (
                        <p className="text-sm text-muted-foreground">{room.description}</p>
                      )}
                      {room.photos?.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {room.photos.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Редактировать номер' : 'Новый номер'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Название *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Стандарт №101, Люкс 'Горный'"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип номера</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as RoomType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Цена за ночь (₽) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.price_per_night}
                  onChange={e => setForm(p => ({ ...p, price_per_night: e.target.value }))}
                  placeholder="3500"
                />
              </div>
              <div className="space-y-2">
                <Label>Макс. гостей</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={form.max_guests}
                  onChange={e => setForm(p => ({ ...p, max_guests: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Площадь (м²)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.area_sqm}
                  onChange={e => setForm(p => ({ ...p, area_sqm: e.target.value }))}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label>Этаж</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.floor}
                  onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                  placeholder="3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Уютный номер с видом на горы..."
                className="resize-none min-h-[80px]"
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Доступен для бронирования</Label>
              <Switch
                checked={form.is_available}
                onCheckedChange={v => setForm(p => ({ ...p, is_available: v }))}
              />
            </div>

            <Separator />

            {/* Amenities */}
            <div className="space-y-3">
              <Label>Удобства</Label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_PRESETS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenityPreset(a)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.amenities.includes(a)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={amenityInput}
                  onChange={e => setAmenityInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity() } }}
                  placeholder="Своё удобство..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomAmenity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.amenities.filter(a => !AMENITY_PRESETS.includes(a)).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.amenities.filter(a => !AMENITY_PRESETS.includes(a)).map(a => (
                    <Badge key={a} variant="secondary" className="flex items-center gap-1 pr-1">
                      {a}
                      <button type="button" onClick={() => setForm(p => ({ ...p, amenities: p.amenities.filter(x => x !== a) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Photos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Фотографии</Label>
              {form.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {form.photos.map((url, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.photos.length < 10 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed h-16 gap-2"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">
                      {uploadingPhoto ? 'Загружаем...' : `Загрузить фото (${form.photos.length}/10)`}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingRoom ? 'Сохранить' : 'Создать номер'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
