import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Heart, MessageCircle, Share2, Building2,
  Pencil, Trash2, Loader as LoaderIcon, Calendar, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { BlogPost } from '@/lib/database.types'
import { toast } from 'sonner'

interface PostWithInfluencer extends BlogPost {
  influencer_profiles: {
    id: string
    first_name: string
    last_name: string
    followers_count: number
    instagram_url: string | null
  }
  hotel_profiles?: { id: string; name: string; city: string } | null
}

export default function BlogPostPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, influencerProfile } = useAuthStore()
  const [post, setPost] = useState<PostWithInfluencer | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const isOwner = influencerProfile && post && influencerProfile.id === post.influencer_id

  useEffect(() => {
    if (id) fetchPost()
  }, [id])

  useEffect(() => {
    if (user && post) fetchLikeStatus()
  }, [user, post?.id])

  const fetchPost = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, influencer_profiles(id, first_name, last_name, followers_count, instagram_url), hotel_profiles(id, name, city)')
      .eq('id', id!)
      .maybeSingle()

    if (error || !data) {
      toast.error('Пост не найден')
      navigate(-1)
      return
    }
    setPost(data as PostWithInfluencer)
    setLoading(false)
  }

  const fetchLikeStatus = async () => {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', post!.id)
      .eq('user_id', user!.id)
      .maybeSingle()
    setLiked(!!data)
  }

  const toggleLike = async () => {
    if (!user) { toast.error('Войдите, чтобы лайкать'); return }
    if (!post) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.from('blog_posts').update({ likes_count: post.likes_count - 1 }).eq('id', post.id)
      setLiked(false)
      setPost(p => p ? { ...p, likes_count: p.likes_count - 1 } : p)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.from('blog_posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id)
      setLiked(true)
      setPost(p => p ? { ...p, likes_count: p.likes_count + 1 } : p)
    }
  }

  const sharePost = () => {
    navigator.clipboard.writeText(`${window.location.origin}/blog/${id}`)
    toast.success('Ссылка скопирована!')
  }

  const deletePost = async () => {
    if (!post) return
    setDeleting(true)
    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id)
    if (error) {
      toast.error('Ошибка при удалении')
      setDeleting(false)
    } else {
      toast.success('Пост удалён')
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!post) return null

  const authorName = `${post.influencer_profiles.first_name} ${post.influencer_profiles.last_name}`
  const initials = authorName.slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Назад
      </Button>

      {/* Author */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold leading-tight">{authorName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {post.influencer_profiles.followers_count?.toLocaleString('ru')} подписчиков
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight mb-3 text-balance">{post.title}</h1>

      {/* Hotel badge */}
      {post.hotel_profiles && (
        <Link
          to={`/hotels/${post.hotel_profiles.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
        >
          <Building2 className="w-4 h-4" />
          {post.hotel_profiles.name} — {post.hotel_profiles.city}
        </Link>
      )}

      {/* Status badge for owner */}
      {isOwner && post.status === 'draft' && (
        <div className="mb-4">
          <Badge variant="secondary">Черновик</Badge>
        </div>
      )}

      {/* Photos grid */}
      {post.photos.length > 0 && (
        <div className={`grid gap-2 mb-6 ${post.photos.length === 1 ? 'grid-cols-1' : post.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {post.photos.map((url, i) => (
            <button
              key={url}
              onClick={() => setSelectedPhoto(url)}
              className={`overflow-hidden rounded-xl bg-muted ${post.photos.length === 1 ? 'aspect-video' : 'aspect-square'} ${i === 0 && post.photos.length >= 3 ? 'col-span-2 row-span-2' : ''}`}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="prose-sm max-w-none">
        <p className="text-foreground leading-relaxed whitespace-pre-line text-[15px]">{post.content}</p>
      </div>

      {/* Video */}
      {post.video_url && (
        <div className="mt-6 p-4 rounded-xl border border-border bg-muted/40">
          <p className="text-sm font-medium mb-2 text-muted-foreground">Видео</p>
          <a
            href={post.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline break-all"
          >
            {post.video_url}
          </a>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          <Tag className="w-4 h-4 text-muted-foreground self-center" />
          {post.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
          ))}
        </div>
      )}

      <Separator className="my-6" />

      {/* Actions row */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          <span>{post.likes_count}</span>
        </button>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count}</span>
        </div>

        <button
          onClick={sharePost}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Owner controls */}
        {isOwner && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link to={`/dashboard/blog/${post.id}/edit`}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Редактировать
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5">
                  {deleting ? (
                    <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Удалить
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить пост?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие нельзя отменить. Пост будет удалён навсегда.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deletePost}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
