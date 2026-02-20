"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "./AuthContext"

interface PushNotificationContextType {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  isSupported: false,
  isSubscribed: false,
  permission: null,
  subscribe: async () => false,
  unsubscribe: async () => false
})

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const hasAutoSubscribed = useRef(false)

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        setRegistration(reg)
        
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      }).catch(console.error)
    }
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration || !user) return false

    try {
      let perm = Notification.permission
      if (perm === "default") {
        perm = await Notification.requestPermission()
        setPermission(perm)
      }

      if (perm !== "granted") return false

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: user.id
        })
      })

      if (res.ok) {
        setIsSubscribed(true)
        return true
      }
      return false
    } catch (error) {
      console.error("Subscribe error:", error)
      return false
    }
  }, [isSupported, registration, user])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration || !user) return false

    try {
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return true

      await subscription.unsubscribe()

      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userId: user.id
        })
      })

      setIsSubscribed(false)
      return true
    } catch (error) {
      console.error("Unsubscribe error:", error)
      return false
    }
  }, [registration, user])

  useEffect(() => {
    const autoSubscribe = async () => {
      if (!user || !registration || !isSupported || hasAutoSubscribed.current) return
      if (isSubscribed) return
      
      const perm = Notification.permission
      if (perm === "granted") {
        hasAutoSubscribed.current = true
        try {
          const existingSub = await registration.pushManager.getSubscription()
          if (existingSub) {
            const res = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: existingSub.toJSON(),
                userId: user.id
              })
            })
            if (res.ok) setIsSubscribed(true)
          } else {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            })
            const res = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: subscription.toJSON(),
                userId: user.id
              })
            })
            if (res.ok) setIsSubscribed(true)
          }
        } catch (error) {
          console.error("Auto-subscribe error:", error)
        }
      }
    }
    autoSubscribe()
  }, [user, registration, isSupported, isSubscribed])

  return (
    <PushNotificationContext.Provider value={{ isSupported, isSubscribed, permission, subscribe, unsubscribe }}>
      {children}
    </PushNotificationContext.Provider>
  )
}

export const usePushNotification = () => useContext(PushNotificationContext)
