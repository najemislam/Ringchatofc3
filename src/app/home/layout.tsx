"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

// Redirect all /home/* routes to their new top-level equivalents
const REDIRECTS: Record<string, string> = {
  "/home": "/chats",
  "/home/chats": "/chats",
  "/home/friends": "/connect",
  "/home/notifications": "/notifications",
  "/home/profile": "/profile",

  "/home/search": "/search",
  "/home/settings": "/settings",
  "/home/community": "/community",
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Handle /home/chat/[id] → /chats/[id]
    const chatMatch = pathname.match(/^\/home\/chat\/(.+)$/)
    if (chatMatch) {
      router.replace(`/chats/${chatMatch[1]}`)
      return
    }

    // Handle exact redirects
    const redirect = REDIRECTS[pathname]
    if (redirect) {
      router.replace(redirect)
      return
    }

    // Default: redirect /home/* to /chats
    if (pathname.startsWith("/home")) {
      router.replace("/chats")
    }
  }, [pathname, router])

  return <>{children}</>
}
