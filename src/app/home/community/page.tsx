"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { 
  Users, 
  Plus, 
  Search, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  Menu
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useMenu } from "@/context/MenuContext"

interface Community {
  id: string
  name: string
  description: string
  image_url: string | null
  member_count?: number
  is_member?: boolean
}

export default function CommunitiesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { openMenu } = useMenu()
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (user) {
      fetchCommunities()
    }
  }, [user])

  const fetchCommunities = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch communities user is a member of
      const { data: memberData } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)

      const joinedIds = memberData?.map(m => m.community_id) || []

      // Fetch all communities
      const { data: allCommunities } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })

      if (allCommunities) {
        const communitiesWithStats = await Promise.all(allCommunities.map(async (comm) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', comm.id)
          
          return {
            ...comm,
            member_count: count || 0,
            is_member: joinedIds.includes(comm.id)
          }
        }))

        setMyCommunities(communitiesWithStats.filter(c => c.is_member))
        setDiscoverCommunities(communitiesWithStats.filter(c => !c.is_member))
      }
    } catch (error) {
      console.error("Error fetching communities:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDiscover = discoverCommunities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold font-syne">Communities</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/home/settings/create-community"
            className="p-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </Link>
          <button 
            onClick={openMenu}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted/50 border-none focus:ring-2 focus:ring-green-500 transition-all"
          />
        </div>

        {/* My Communities */}
        {myCommunities.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">My Communities</h2>
            <div className="grid gap-3">
              {myCommunities.map((community) => (
                <Link 
                  key={community.id}
                  href={`/home/community/${community.id}`}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-border hover:border-green-500/50 transition-all group"
                >
                  {community.image_url ? (
                    <img src={community.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{community.name}</h3>
                    <p className="text-xs text-muted-foreground">{community.member_count} members</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-green-600 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Discover Communities */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Discover</h2>
          {filteredDiscover.length > 0 ? (
            <div className="grid gap-3">
              {filteredDiscover.map((community) => (
                <Link 
                  key={community.id}
                  href={`/home/community/${community.id}`}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-border hover:border-green-500/50 transition-all group"
                >
                  {community.image_url ? (
                    <img src={community.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{community.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{community.description || "No description"}</p>
                    <p className="text-[10px] text-green-600 font-medium mt-1">{community.member_count} members</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-green-600 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 rounded-3xl bg-muted/30 border-2 border-dashed border-border">
              <LayoutGrid className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">No communities found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try searching for something else or create your own!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
