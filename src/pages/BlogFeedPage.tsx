import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, Building2, Plus, Images, Loader as Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { BlogPost } from '@/lib/database.types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 6

interface PostWithInfluencer extends BlogPost {
  influencer_profiles: {
    id: string
    first_name: string
    last_name: string
    followers_count: number
  }
  hotel_profiles?: { id: string; name: string } | null
}

function PhotoCarousel({ photos }: { photos: string[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on('select', () => setCurrent(api.selectedScrollSnap()))
  }, [api])

  if (photos.length === 0) return null

  return (
    <div className="relative">
      <Carousel setApi={setApi} opts={{ loop: false }} className="w-full">
        <CarouselContent className="-ml-0">
          {photos.map((url, i) => (
            <CarouselItem key={i} className="pl-0">
              <div className="aspect-square w-full bg-muted overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {photos.length > 1 && (
          <>
            <CarouselPrevious className="left-2 h-8 w-8 bg-background/80 hover:bg-background border-0 shadow-md backdrop-blur-sm" />
            <CarouselNext className="right-2 h-8 w-8 bg-background/80 hover:bg-background border-0 shadow-md backdrop-blur-sm" />
          </>
        )}
      </Carousel>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full transition-all duration-200',
                i === current
                  ? 'w-4 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/60'
              )}
            />
          ))}
        </div>
      )}

      {/* Photo count badge */}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5 pointer-events-none">
          <Images className="w-3 h-3 text-foreground" />
          <span className="text-xs font-medium text-foreground">{current + 1}/{count}</span>
        </div>
      )}
    </div>
  )
}

function PostSkeleton() {
  return (
    <article className="border-b border-border pb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full" />
      <div className="px-4 pt-3 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </article>
  )
}

function PostCard({
  post,
  liked,
  onLike,
  onShare,
}: {
  post: PostWithInfluencer
  liked: boolean
  onLike: (id: string) => void
  onShare: (id: string) => void
}) {
  const name = `${post.influencer_profiles.first_name} ${post.influencer_profiles.last_name}`
  const initials = name.slice(0, 2).toUpperCase()
  const [expanded, setExpanded] = useState(false)
  const isLong = post.content.length > 160

  return (
    <article className="border-b border-border last:border-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="w-9 h-9 ring-2 ring-border ring-offset-1 ring-offset-background">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{name}</p>
          {post.hotel_profiles && (
            <Link
              to={`/hotels/${post.hotel_profiles.id}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline leading-tight mt-0.5"
            >
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{post.hotel_profiles.name}</span>
            </Link>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Photo carousel */}
      {post.photos.length > 0 && (
        <PhotoCarousel photos={post.photos} />
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1 -ml-1">
          {/* Like */}
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              'group flex items-center justify-center w-9 h-9 rounded-full transition-colors',
              liked
                ? 'text-destructive'
                : 'text-foreground hover:text-destructive'
            )}
            aria-label={liked ? 'Убрать лайк' : 'Лайкнуть'}
          >
            <Heart
              className={cn(
                'w-6 h-6 transition-all duration-150',
                liked ? 'fill-current scale-110' : 'group-hover:scale-110'
              )}
            />
          </button>

          {/* Comment */}
          <Link
            to={`/blog/${post.id}`}
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:text-muted-foreground transition-colors"
            aria-label="Комментарии"
          >
            <MessageCircle className="w-6 h-6" />
          </Link>

          {/* Share */}
          <button
            onClick={() => onShare(post.id)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:text-muted-foreground transition-colors"
            aria-label="Поделиться"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 mt-0.5">
          {post.likes_count > 0 && (
            <p className="text-sm font-semibold">{post.likes_count.toLocaleString('ru')} отметок «Нравится»</p>
          )}
          {post.comments_count > 0 && (
            <p className="text-sm text-muted-foreground">{post.comments_count} комментариев</p>
          )}
        </div>

        {/* Caption */}
        <div className="mt-2">
          <Link to={`/blog/${post.id}`} className="hover:underline decoration-muted-foreground">
            <span className="text-sm font-semibold mr-2">{name}</span>
          </Link>
          <span className="text-sm leading-snug">
            {isLong && !expanded
              ? <>{post.content.slice(0, 160)}<button onClick={() => setExpanded(true)} className="text-muted-foreground ml-1 hover:text-foreground">...ещё</button></>
              : post.content
            }
          </span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-primary">#{tag}</span>
            ))}
          </div>
        )}

        {/* See all photos link */}
        {post.photos.length > 1 && (
          <Link
            to={`/blog/${post.id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            <Images className="w-3.5 h-3.5" />
            Смотреть все фото ({post.photos.length})
          </Link>
        )}
      </div>

      <div className="px-4 pb-3 mt-1">
        <Link to={`/blog/${post.id}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          {new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        </Link>
      </div>
    </article>
  )
}

export default function BlogFeedPage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<PostWithInfluencer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const pageRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (page: number) => {
    const isFirst = page === 0
    if (isFirst) setLoading(true)
    else setLoadingMore(true)

    const { data } = await supabase
      .from('blog_posts')
      .select('*, influencer_profiles(id, first_name, last_name, followers_count), hotel_profiles(id, name)')
      .eq('is_published', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    const rows = (data as PostWithInfluencer[]) ?? []
    setPosts(prev => isFirst ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)

    if (isFirst) setLoading(false)
    else setLoadingMore(false)
  }, [])

  const fetchLikedPosts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
    setLikedPosts(new Set((data ?? []).map((l: { post_id: string }) => l.post_id)))
  }, [user])

  useEffect(() => {
    pageRef.current = 0
    fetchPosts(0)
  }, [])

  useEffect(() => {
    fetchLikedPosts()
  }, [user])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          pageRef.current += 1
          fetchPosts(pageRef.current)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, fetchPosts])

  const toggleLike = async (postId: string) => {
    if (!user) { toast.error('Войдите, чтобы лайкать'); return }
    const isLiked = likedPosts.has(postId)
    const post = posts.find(p => p.id === postId)
    if (!post) return

    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      await supabase.from('blog_posts').update({ likes_count: post.likes_count - 1 }).eq('id', postId)
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      await supabase.from('blog_posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId)
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
    }
  }

  const sharePost = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/blog/${postId}`)
    toast.success('Ссылка скопирована!')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[600px] mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Лента</h1>
          {user?.role === 'influencer' && (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5" asChild>
              <Link to="/dashboard/blog/new">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Написать</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Feed */}
        {loading ? (
          <div>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-lg mb-1">Лента пока пуста</p>
            <p className="text-sm text-muted-foreground mb-6">Инфлюенсеры скоро начнут публиковать свои обзоры</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/hotels">Посмотреть отели</Link>
            </Button>
          </div>
        ) : (
          <>
            <div>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={likedPosts.has(post.id)}
                  onLike={toggleLike}
                  onShare={sharePost}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading more */}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* End of feed */}
            {!hasMore && posts.length > 0 && (
              <div className="py-10 flex flex-col items-center gap-3">
                <Separator className="w-16" />
                <p className="text-xs text-muted-foreground">Вы посмотрели все посты</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
