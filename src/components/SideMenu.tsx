"use client"

import { X, CircleUserRound, UsersRound, Bell, LogOut, LayoutGrid, Settings } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { useMenu } from "@/context/MenuContext"

export function SideMenu() {
  const { user, logout } = useAuth()
  const { isMenuOpen, closeMenu } = useMenu()
  
  const menuItems = [
    { label: "Profile", icon: CircleUserRound, href: `/profile` },
    { label: "Connect", icon: UsersRound, href: "/connect" },
    { label: "Communities", icon: LayoutGrid, href: "/community" },
      { label: "Notifications", icon: Bell, href: "/notifications" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ]

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMenu}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-background border-l border-border z-[201] flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.svg" alt="Ringchat" className="w-8 h-8 rounded-lg" />
                  <span className="text-xl font-bold font-syne text-green-600">Ringchat</span>
                </div>
              <button 
                onClick={closeMenu}
                className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* User Profile Section in Drawer */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border">
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-green-500 text-white font-bold">
                      {user?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <nav className="px-2 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <div className="w-12 h-12 flex items-center justify-center">
                        <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-green-600 transition-colors" />
                      </div>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={() => {
                  closeMenu()
                  logout()
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <LogOut className="w-6 h-6" />
                  </div>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
