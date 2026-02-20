"use client"

import { usePathname } from "next/navigation"
import { Search, X } from "lucide-react"
import Link from "next/link"
import { useMenu } from "@/context/MenuContext"
import { useRealTimeNotification } from "@/context/RealTimeNotificationContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { useScrollDirection } from "@/hooks/useScrollDirection"

interface TopBarProps {
  onCreatePostClick?: () => void
}

export function TopBar({ onCreatePostClick }: TopBarProps = {}) {
  const pathname = usePathname()
  const { openMenu } = useMenu()
  const { notification, clearNotification } = useRealTimeNotification()
  const { visible } = useScrollDirection()

  const getTitle = () => {
    if (pathname === "/connect") return "Connect"
    if (pathname === "/notifications") return "Notifications"
    return null
  }

  const isChatsPage = pathname === "/chats"
  const title = getTitle()

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-b border-border z-[110] flex items-center justify-between px-4 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {notification ? (
          <motion.div
            key="notification"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-between px-4 bg-green-50 dark:bg-green-950/30 z-[120]"
          >
            <Link
              href={notification.url || "#"}
              className="flex items-center gap-3 flex-1 min-w-0"
              onClick={clearNotification}
            >
              <Avatar className="h-9 w-9 border border-green-200 dark:border-green-800">
                <AvatarImage src={notification.icon} />
                <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {notification.title[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-green-700 dark:text-green-400 truncate">
                  {notification.title}
                </span>
                <p className="text-xs text-muted-foreground truncate">
                  {notification.body}
                </p>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearNotification();
              }}
              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full transition-colors ml-2"
            >
              <X className="w-4 h-4 text-green-700 dark:text-green-400" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              {isChatsPage ? (
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Ringchat" className="w-[32px] h-[32px] rounded-[28%]" />
                  <span className="text-[20px] font-bold font-syne text-green-600">Ringchat</span>
                </div>
              ) : title ? (
                <h1 className="text-[20px] font-bold font-syne">{title}</h1>
              ) : (
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Ringchat" className="w-[32px] h-[32px] rounded-[28%]" />
                  <span className="text-[20px] font-bold font-syne text-green-600">Ringchat</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(isChatsPage || pathname === "/connect" || pathname === "/notifications") && (
                <div className="flex items-center gap-2">
                  <Link href="/search" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all active:scale-95 group">
                    <Search className="w-6 h-6 text-foreground group-hover:text-green-600 transition-colors" strokeWidth={1.5} />
                  </Link>
                </div>
              )}

              <button
                onClick={openMenu}
                className="w-10 h-10 flex items-center justify-center -mr-1 rounded-xl hover:bg-muted transition-colors active:scale-95"
              >
                <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
