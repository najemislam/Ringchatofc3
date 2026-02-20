"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

interface Notification {
  id: string
  title: string
  body: string
  icon?: string
  url?: string
}

interface RealTimeNotificationContextType {
  notification: Notification | null
  showNotification: (notif: Omit<Notification, "id">) => void
  clearNotification: () => void
}

const RealTimeNotificationContext = createContext<RealTimeNotificationContextType | undefined>(undefined)

export function RealTimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)

  const clearNotification = useCallback(() => {
    setNotification(null)
  }, [])

  const showNotification = useCallback((notif: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substring(7)
    setNotification({ ...notif, id })
    
    // Auto-clear after 5 seconds
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev)
    }, 5000)
  }, [])

  return (
    <RealTimeNotificationContext.Provider value={{ notification, showNotification, clearNotification }}>
      {children}
    </RealTimeNotificationContext.Provider>
  )
}

export const useRealTimeNotification = () => {
  const context = useContext(RealTimeNotificationContext)
  if (context === undefined) {
    throw new Error("useRealTimeNotification must be used within a RealTimeNotificationProvider")
  }
  return context
}
