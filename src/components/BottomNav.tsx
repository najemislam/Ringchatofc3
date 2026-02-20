"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { MessageCircle, UsersRound, Bell, CircleUserRound } from "lucide-react"

const navItems = [
  { href: "/chats", icon: MessageCircle, label: "Chats" },
  { href: "/connect", icon: UsersRound, label: "Connect" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/profile", icon: CircleUserRound, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur-md border-t border-border z-[110] h-16 transition-all duration-200">
      <div className="flex items-center w-full h-full">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href) && href !== "/"

          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center h-full transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-95"
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-green-500/15 text-green-600"
                    : "hover:bg-muted/50"
                }`}>
                <Icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? "fill-current" : ""}`} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
