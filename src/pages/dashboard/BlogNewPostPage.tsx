import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader as Loader2, Plus, X, Image as ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { HotelProfile } from '@/lib/database.types'
import { toast } from 'sonner'

export default function BlogNewPostPage() {
  const { user, influencerProfile } = useAuthStore()
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id?: string }>()
  const isEdit = !!editId

  const [loading, setLoading] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [hotels, setHotels] = useState<Pick<HotelProfile, 'id' | 'name' | 'city'>[]>([])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hotelId, setHotelId] = useState<string>('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [photos, setPhotos] = useState<{ url: string; uploading: boolean }[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchHotels()
    if (isEdit) loadPost()
  }, [])

  const fetchHotels = async () => {
    const { data } = await supabase
      .from('hotel_profiles')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name')
    setHotels(data ?? [])
  }

  const loadPost = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', editId!)
      .maybeSingle()

    if (error || !data) {
      toast.error('Пост не найден')
      navigate(-1)
      return
    }

    setTitle(data.title)
    setContent(data.content)
    setHotelId(data.hotel_id ?? '')
    setTags(data.tags ?? [])
    setPhotos((data.photos ?? []).map((url: string) => ({ url, uploading: false })))
    setVideoUrl(data.video_url ?? '')
    setInitialLoading(false)
  }

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^а-яёa-z0-9_-]/gi, '')
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user) return

    const remaining = 10 - photos.length
    const toUpload = files.slice(0, remaining)

    const placeholders = toUpload.map(f => ({ url: URL.createObjectURL(f), uploading: true }))
    setPhotos(prev => [...prev, ...placeholders])

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      const blobUrl = placeholders[i].url
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from('blog-images').upload(path, file)

      if (error) {
        setPhotos(prev => prev.filter(p => p.url !== blobUrl))
        toast.error(`Не удалось загрузить ${file.name}`)
      } else {
        const { data: publicData } = supabase.storage.from('blog-images').getPublicUrl(data.path)
        setPhotos(prev => prev.map(p =>
          p.url === blobUrl ? { url: publicData.publicUrl, uploading: false } : p
        ))
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (url: string) => {
    setPhotos(prev => prev.filter(p => p.url !== url))
  }

  const handleSubmit = async (asDraft: boolean) => {
    if (!title.trim()) { toast.error('Введите заголовок'); return }
    if (!content.trim()) { toast.error('Напишите содержание поста'); return }
    if (!influencerProfile) { toast.error('Профиль инфлюенсера не найден'); return }
    if (photos.some(p => p.uploading)) { toast.error('Дождитесь загрузки фотографий'); return }

    setLoading(true)
    setIsDraft(asDraft)

    const payload = {
      title: title.trim(),
      content: content.trim(),
      hotel_id: hotelId || null,
      tags,
      photos: photos.map(p => p.url),
      video_url: videoUrl.trim() || null,
      is_published: !asDraft,
      status: asDraft ? 'draft' : 'published',
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('blog_posts').update(payload).eq('id', editId!))
    } else {
      ;({ error } = await supabase.from('blog_posts').insert({
        ...payload,
        influencer_id: influencerProfile.id,
        likes_count: 0,
        comments_count: 0,
      }))
    }

    if (error) {
      toast.error(isEdit ? 'Ошибка при сохранении' : 'Ошибка при публикации')
    } else {
      toast.success(asDraft ? 'Черновик сохранён' : isEdit ? 'Пост обновлён!' : 'Пост опубликован!')
      navigate(isEdit ? `/dashboard/blog/${editId}` : '/dashboard')
    }
    setLoading(false)
  }

  if (initialLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/dashboard/blog/${editId}` : '/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Редактировать пост' : 'Новый пост'}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? 'Внесите изменения и сохраните' : 'Поделитесь впечатлениями с аудиторией'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Содержание</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Неделя в горах Кавказа — честный отзыв"
                maxLength={120}
              />
              <div className="text-xs text-muted-foreground text-right">{title.length}/120</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Текст поста *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Расскажите о своём опыте, впечатлениях, советах..."
                className="min-h-[200px] resize-none"
                maxLength={5000}
              />
              <div className="text-xs text-muted-foreground text-right">{content.length}/5000</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Связанный отель (опционально)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={hotelId || 'none'} onValueChange={v => setHotelId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите отель, если пост о нём" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без привязки к отелю</SelectItem>
                {hotels.map(h => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Фотографии
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <div key={photo.url} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photos.length < 10 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Нажмите чтобы загрузить фото ({photos.length}/10)
                  </span>
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP. Максимум 5 МБ на файл, до 10 фотографий.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Видео (опционально)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Ссылка на видео (YouTube, VK Video и т.д.)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Теги</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Введите тег и нажмите Enter"
                maxLength={30}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Максимум 10 тегов.</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={() => handleSubmit(false)} disabled={loading} className="flex-1">
            {loading && !isDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isEdit ? 'Опубликовать' : 'Опубликовать пост'}
          </Button>
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading} className="flex-1 sm:flex-none">
            {loading && isDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Сохранить черновик
          </Button>
          <Button variant="ghost" onClick={() => navigate(isEdit ? `/dashboard/blog/${editId}` : '/dashboard')} disabled={loading}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  )
}
