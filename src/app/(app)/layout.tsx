"use client"

import { useEffect, Suspense } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { RingchatLogoSmall } from "@/components/RingchatLogo"
import NotificationManager from "@/components/NotificationManager"
import { TopBar } from "@/components/TopBar"
import { BottomNav } from "@/components/BottomNav"
import { SideMenu } from "@/components/SideMenu"

function HomeLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const isChatPage = pathname.startsWith("/home/chat/")
  const isPostPage = pathname.includes("/post/")
  const isChatsPage = pathname === "/home/chats"

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <RingchatLogoSmall size={64} />
        </div>
      </div>
    )
  }

  if (!user) return null

  const isProfilePage = pathname === "/home/profile"
  const showTopBar = !isProfilePage && (isChatsPage || pathname === "/home/friends" || pathname === "/home/notifications")
  const showBottomNav = !isChatPage && !isPostPage

  return (
    <div className="min-h-screen bg-background flex flex-col w-full relative">
      <NotificationManager />
      <SideMenu />
      
      {showTopBar && <TopBar />}

      <main className={`flex-1 ${showTopBar ? 'pt-16' : 'pt-0'} ${showBottomNav ? 'pb-16' : 'pb-0'} min-h-screen`}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  )

}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <RingchatLogoSmall size={64} />
        </div>
      </div>
    }>
      <HomeLayoutContent>{children}</HomeLayoutContent>
    </Suspense>
  )
}
