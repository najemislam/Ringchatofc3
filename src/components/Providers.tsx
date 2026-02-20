"use client"

import { AuthProvider } from "@/context/AuthContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { PushNotificationProvider } from "@/context/PushNotificationContext"
import { MenuProvider } from "@/context/MenuContext"
import { RealTimeNotificationProvider } from "@/context/RealTimeNotificationContext"
import { CallProvider } from "@/context/CallContext"
import { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MenuProvider>
          <PushNotificationProvider>
            <RealTimeNotificationProvider>
              <CallProvider>
                {children}
              </CallProvider>
            </RealTimeNotificationProvider>
          </PushNotificationProvider>
        </MenuProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
