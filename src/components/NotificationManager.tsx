"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { createClient } from "@/lib/supabase/client"
import { usePathname } from "next/navigation"
import { useRealTimeNotification } from "@/context/RealTimeNotificationContext"

export default function NotificationManager() {
  const { user } = useAuth();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showNotification } = useRealTimeNotification();

  useEffect(() => {
    const requestPermission = async () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      }
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/pop.mp3");
    }
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const sendPushNotification = async (targetUserId: string, title: string, body: string, icon?: string, url?: string, data?: any) => {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          title,
          body,
          icon,
          url,
          data
        })
      });
    } catch (error) {
      console.error("Failed to send push notification:", error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const messageChannel = supabase
      .channel(`global-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.sender_id === user.id) return;

          const { data: participant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", newMessage.conversation_id)
            .neq("user_id", newMessage.sender_id)
            .single();

          if (participant?.user_id !== user.id) return;

          const currentConversationId = pathname.startsWith("/chats/")
              ? pathname.split("/").pop()
              : null;

          if (currentConversationId === newMessage.conversation_id) return;

          const { data: sender } = await supabase
            .from("users")
            .select("full_name, profile_picture")
            .eq("id", newMessage.sender_id)
            .single();

          playSound();
          
          showNotification({
              title: sender?.full_name || "New Message",
              body: newMessage.content,
              icon: sender?.profile_picture,
              url: `/chats/${newMessage.conversation_id}`
            });
            
            await sendPushNotification(
              user.id,
              sender?.full_name || "New Message",
              newMessage.content,
              sender?.profile_picture,
              `/chats/${newMessage.conversation_id}`,
            { conversationId: newMessage.conversation_id }
          );
        }
      )
      .subscribe();

    const notificationChannel = supabase
      .channel(`global-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as any;
          
          const { data: actor } = await supabase
            .from("users")
            .select("full_name, profile_picture")
            .eq("id", newNotif.sender_id)
            .single();

          playSound();

          showNotification({
              title: actor?.full_name || "Ringchat",
              body: newNotif.content,
              icon: actor?.profile_picture,
              url: "/notifications"
            });
            
            await sendPushNotification(
              user.id,
              actor?.full_name || "Ringchat",
              newNotif.content,
              actor?.profile_picture,
              "/notifications",
            { notificationId: newNotif.id }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user, pathname]);

  return null;
}
