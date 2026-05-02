import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Share2, User, Building2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  }
  hotel_profiles?: { name: string } | null
}

export default function BlogFeedPage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<PostWithInfluencer[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPosts()
    if (user) fetchLikedPosts()
  }, [user])

  const fetchPosts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select('*, influencer_profiles(id, first_name, last_name, followers_count), hotel_profiles(name)')
      .eq('is_published', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)
    setPosts((data as PostWithInfluencer[]) ?? [])
    setLoading(false)
  }

  const fetchLikedPosts = async () => {
    const { data } = await supabase.from('post_likes').select('post_id').eq('user_id', user!.id)
    setLikedPosts(new Set((data ?? []).map(l => l.post_id)))
  }

  const toggleLike = async (postId: string) => {
    if (!user) { toast.error('Войдите, чтобы лайкать'); return }
    const isLiked = likedPosts.has(postId)
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      await supabase.from('blog_posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 }).eq('id', postId)
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      await supabase.from('blog_posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 }).eq('id', postId)
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
    }
  }

  const sharePost = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/blog/${postId}`)
    toast.success('Ссылка скопирована!')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Лента путешественников</h1>
          <p className="text-muted-foreground">Посты инфлюенсеров о лучших отелях</p>
        </div>
        {user?.role === 'influencer' && (
          <Button size="sm" asChild>
            <Link to="/dashboard/blog/new"><Plus className="mr-2 w-4 h-4" /> Написать</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-24 w-full mb-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Лента пока пуста</p>
          <p className="text-sm mb-6">Инфлюенсеры скоро начнут публиковать свои обзоры</p>
          <Button asChild variant="outline">
            <Link to="/hotels">Посмотреть отели</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const name = `${post.influencer_profiles.first_name} ${post.influencer_profiles.last_name}`
            return (
              <Card key={post.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                <CardContent className="p-0">
                  {/* Author header */}
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {post.influencer_profiles.followers_count?.toLocaleString('ru')} подписчиков
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>

                  {/* Post content */}
                  <div className="px-4 pb-3">
                    <h2 className="font-semibold mb-2">{post.title}</h2>
                    {post.hotel_profiles && (
                      <div className="flex items-center gap-1 text-xs text-primary mb-2">
                        <Building2 className="w-3 h-3" /> {post.hotel_profiles.name}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{post.content}</p>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                      <span>{post.likes_count}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments_count}</span>
                    </button>
                    <button
                      onClick={() => sharePost(post.id)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
