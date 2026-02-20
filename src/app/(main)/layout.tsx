"use client"

import { useEffect, Suspense, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { RingchatLogoSmall } from "@/components/RingchatLogo"
import NotificationManager from "@/components/NotificationManager"
import { TopBar } from "@/components/TopBar"
import { BottomNav } from "@/components/BottomNav"
import { SideMenu } from "@/components/SideMenu"

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const previousPathRef = useRef<string | null>(null)

  const isChatPage = pathname.startsWith("/chats/") && pathname !== "/chats"
  const isPostPage = pathname.includes("/post/")
  const isChatsPage = pathname === "/chats"

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    previousPathRef.current = pathname
  }, [pathname])

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

  const isProfilePage =
    pathname === "/profile" ||
    (pathname.startsWith("/profile/") && pathname !== "/profile")
  const showTopBar =
    !isProfilePage &&
    (isChatsPage ||
      pathname === "/connect" ||
      pathname === "/notifications")
  const showBottomNav =
    !isChatPage &&
    !isPostPage

  return (
    <div className="min-h-screen bg-background flex flex-col w-full relative">
      <NotificationManager />
      <SideMenu />

      {showTopBar && <TopBar />}

      <main
        className={`flex-1 ${showTopBar ? "pt-16" : "pt-0"} ${showBottomNav ? "pb-16" : "pb-0"} min-h-screen`}
      >
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse">
            <RingchatLogoSmall size={64} />
          </div>
        </div>
      }
    >
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  )
}
