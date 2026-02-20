"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"
import { Download, Share2 } from "lucide-react"
import { toast } from "sonner"

export default function LandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/home/chats')
    }
  }, [user, loading, router])

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (loading || user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-green-50 dark:from-slate-900 dark:to-slate-800">
          <img src="/logo.svg" alt="Ringchat" className="w-20 h-20 rounded-[28%]" />
          <div className="mt-4 w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
  }

  const handleDownload = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setDeferredPrompt(null)
      }
    } else {
      toast.info("Install from Browser", {
        description: "To install Ringchat, tap the share icon or menu and select 'Add to Home Screen'.",
      })
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ringchat',
        text: 'Join me on Ringchat - the best way to connect with friends!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard! Share it on Telegram or WhatsApp.");
    }
  }

    return (
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-white to-green-50 dark:from-slate-900 dark:to-slate-800">
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <img src="/logo.svg" alt="Ringchat" className="w-[120px] h-[120px] rounded-[28%]" />
          </motion.div>
        
        <motion.h1 
          className="mt-6 text-4xl font-bold font-syne text-green-500"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Ringchat
        </motion.h1>
        
        <motion.p 
          className="mt-3 text-muted-foreground text-center max-w-xs md:max-w-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Connect and chat with friends via Ringchat.
        </motion.p>

        <motion.div 
          className="mt-12 w-full max-w-xs md:max-w-md flex flex-col gap-4"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link href="/register" className="w-full">
            <button className="w-full py-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 active:scale-[0.98]">
              Create Account
            </button>
          </Link>
          
          <Link href="/login" className="w-full">
            <button className="w-full py-4 rounded-full border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold text-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 active:scale-[0.98]">
              Log In
            </button>
          </Link>

          <div className="flex gap-4 mt-4">
            <button 
              onClick={handleDownload}
              className="flex-1 py-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2 transition-all hover:bg-green-200 dark:hover:bg-green-900/50"
            >
              <Download className="w-5 h-5" />
              <span>Download App</span>
            </button>
            <button 
              onClick={handleShare}
              className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 transition-all hover:bg-green-200 dark:hover:bg-green-900/50"
              title="Share App"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        © Ringchat 2026. All rights reserved.
      </footer>
    </div>
  )
}
