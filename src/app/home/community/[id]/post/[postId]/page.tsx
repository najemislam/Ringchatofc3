"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  MoreVertical, 
  Heart, 
  MessageCircle, 
  Send, 
  Loader2,
  X
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface Post {
  id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | 'text'
  created_at: string
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    profile_picture: string | null
  }
}

interface Comment {
  id: string
  comment_text: string
  created_at: string
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    profile_picture: string | null
  }
}

const renderTextWithMentions = (text: string) => {
  if (!text) return null
  const mentionRegex = /@(\w+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const username = match[1]
    parts.push(
      <Link 
        key={`${match.index}-${username}`}
        href={`/home/search?q=${username}`}
        className="text-green-600 font-semibold hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [isReacted, setIsReacted] = useState(false)
  const [reactionCount, setReactionCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mentionUsers, setMentionUsers] = useState<any[]>([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionCursorPos, setMentionCursorPos] = useState(0)
  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!params.postId) return
      const supabase = createClient()

      // Fetch Post
      const { data: postData } = await supabase
        .from('community_posts')
        .select(`
          *,
          user:users(id, full_name, username, profile_picture)
        `)
        .eq('id', params.postId)
        .single()

      if (postData) {
        setPost(postData)

        // Fetch Reactions
        const { count: reactionsCount } = await supabase
          .from('community_post_reactions')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', params.postId)
        setReactionCount(reactionsCount || 0)

        if (user) {
          const { data: myReaction } = await supabase
            .from('community_post_reactions')
            .select('id')
            .eq('post_id', params.postId)
            .eq('user_id', user.id)
            .maybeSingle()
          setIsReacted(!!myReaction)
        }

        // Fetch Comments
        const { data: commentsData } = await supabase
          .from('community_post_comments')
          .select(`
            *,
            user:users(id, full_name, username, profile_picture)
          `)
          .eq('post_id', params.postId)
          .order('created_at', { ascending: true })
        setComments(commentsData || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [params.postId, user])

  useEffect(() => {
    const searchMentionUsers = async () => {
      if (!mentionQuery || mentionQuery.length < 1) {
        setMentionUsers([])
        return
      }
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, profile_picture')
        .ilike('username', `%${mentionQuery}%`)
        .limit(5)
      if (data) setMentionUsers(data)
    }
    searchMentionUsers()
  }, [mentionQuery])

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setComment(value)
    
    const textBeforeCursor = value.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionQuery(textAfterAt)
        setMentionCursorPos(atIndex)
        setShowMentionSuggestions(true)
        return
      }
    }
    setShowMentionSuggestions(false)
    setMentionQuery("")
  }

  const insertMention = (username: string) => {
    const beforeMention = comment.slice(0, mentionCursorPos)
    const afterMention = comment.slice(mentionCursorPos + mentionQuery.length + 1)
    setComment(`${beforeMention}@${username} ${afterMention}`)
    setShowMentionSuggestions(false)
    setMentionQuery("")
    commentInputRef.current?.focus()
  }

  const handleToggleReaction = async () => {
    if (!user || !post) return
    const supabase = createClient()
    if (isReacted) {
      await supabase.from('community_post_reactions').delete().eq('post_id', post.id).eq('user_id', user.id)
      setIsReacted(false)
      setReactionCount(prev => Math.max(0, prev - 1))
    } else {
      await supabase.from('community_post_reactions').insert({ post_id: post.id, user_id: user.id })
      setIsReacted(true)
      setReactionCount(prev => prev + 1)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !post || !comment.trim()) return
    setIsSubmitting(true)
    const supabase = createClient()

    const { data, error } = await supabase.from('community_post_comments').insert({
      post_id: post.id,
      user_id: user.id,
      comment_text: comment.trim()
    }).select(`
      *,
      user:users(id, full_name, username, profile_picture)
    `).single()

    if (data) {
      setComments(prev => [...prev, data])
      setComment("")
      toast.success("Comment added!")
    } else {
      toast.error("Failed to add comment")
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Post not found</p>
        <button onClick={() => router.back()} className="text-green-600 font-medium">Go back</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-sm font-bold uppercase tracking-widest">Post</h1>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-6 space-y-6">
        <div className="bg-background rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/home/profile?id=${post.user_id}`} className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                {post.user.profile_picture ? (
                  <img src={post.user.profile_picture} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-green-600 font-bold text-sm">
                    {post.user.full_name.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="flex flex-col">
                <Link href={`/home/profile?id=${post.user_id}`} className="text-sm font-bold hover:underline">{post.user.full_name}</Link>
                <span className="text-[10px] text-muted-foreground font-medium">@{post.user.username} • {new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:bg-muted rounded-full">
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {post.content && (
            <div className="px-4 pb-4">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {renderTextWithMentions(post.content)}
              </p>
            </div>
          )}

          {post.media_url && (
            <div className="aspect-video w-full bg-muted relative">
              {post.media_type === 'video' ? (
                <video src={post.media_url} className="w-full h-full object-cover" controls playsInline />
              ) : (
                <img src={post.media_url} className="w-full h-full object-cover" alt="" />
              )}
            </div>
          )}

          <div className="p-4 flex items-center gap-6 border-t border-border">
            <button 
              onClick={handleToggleReaction}
              className={`flex items-center gap-2 transition-all active:scale-90 ${isReacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`w-5 h-5 ${isReacted ? "fill-current" : ""}`} />
              <span className="text-[11px] font-black uppercase tracking-widest">{reactionCount}</span>
            </button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-6 h-6" />
              <span className="text-[11px] font-black uppercase tracking-widest">{comments.length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Comments</h3>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 bg-muted/20 p-4 rounded-3xl border border-border/50">
              <Link href={`/home/profile?id=${c.user_id}`} className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border flex-shrink-0">
                {c.user.profile_picture ? (
                  <img src={c.user.profile_picture} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-green-600 font-bold text-xs">
                    {c.user.full_name.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/home/profile?id=${c.user_id}`} className="text-xs font-bold hover:underline">{c.user.full_name}</Link>
                  <span className="text-[10px] text-muted-foreground">@{c.user.username}</span>
                </div>
                <p className="text-sm mt-1 text-foreground/80 leading-relaxed">
                  {renderTextWithMentions(c.comment_text)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-2">{new Date(c.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
              <MessageCircle className="w-6 h-6 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No comments yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4 z-50">
        <div className="max-w-2xl mx-auto relative">
          <AnimatePresence>
            {showMentionSuggestions && mentionUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-2xl overflow-hidden shadow-xl"
              >
                {mentionUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => insertMention(u.username)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    {u.profile_picture ? (
                      <img src={u.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                        {u.full_name?.charAt(0) || u.username?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-foreground">@{u.username}</p>
                      <p className="text-[10px] text-muted-foreground">{u.full_name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmitComment} className="flex items-center gap-3 bg-muted rounded-full px-4 py-2 border border-border">
            <input 
              ref={commentInputRef}
              type="text" 
              value={comment}
              onChange={handleCommentChange}
              placeholder="Add a comment... Use @ to mention"
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-muted-foreground"
            />
            <button 
              type="submit" 
              disabled={isSubmitting || !comment.trim()}
              className="p-2 bg-green-600 text-white rounded-full disabled:opacity-50 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
