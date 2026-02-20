"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./AuthContext"
import { createClient } from "@/lib/supabase/client"
import SimplePeer from "simple-peer"
import { toast } from "sonner"

type CallStatus = "idle" | "calling" | "incoming" | "active"

interface CallContextType {
  callStatus: CallStatus
  isAudioOnly: boolean
  remoteUser: { id: string; username: string; full_name: string; profile_picture: string } | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  startCall: (user: any, audioOnly: boolean) => void
  answerCall: () => void
  rejectCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  isMuted: boolean
  isVideoOff: boolean
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [callStatus, setCallStatus] = useState<CallStatus>("idle")
  const [isAudioOnly, setIsAudioOnly] = useState(false)
  const [remoteUser, setRemoteUser] = useState<any>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  
  const peerRef = useRef<Peer.Instance | null>(null)
  const channelRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingSignalRef = useRef<any>(null)

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    setCallStatus("idle")
    setLocalStream(null)
    setRemoteStream(null)
    setRemoteUser(null)
    setIsMuted(false)
    setIsVideoOff(false)
    pendingSignalRef.current = null
  }, [])

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "hangup", from: user?.id }
      })
    }
    cleanup()
  }, [cleanup, user?.id])

  const setupPeer = useCallback((initiator: boolean, stream: MediaStream) => {
    if (typeof window === "undefined") return null;
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ]
      }
    })

    peer.on("signal", data => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "call-signal",
          payload: { type: initiator ? "offer" : "answer", signal: data, from: user?.id }
        })
      }
    })

    peer.on("stream", stream => {
      setRemoteStream(stream)
      setCallStatus("active")
    })

    peer.on("close", () => cleanup())
    peer.on("error", (err) => {
      console.error("Peer error:", err)
      toast.error("Call connection error")
      cleanup()
    })

    peerRef.current = peer
    
    // If there was a pending signal, apply it now
    if (pendingSignalRef.current) {
      peer.signal(pendingSignalRef.current)
      pendingSignalRef.current = null
    }

    return peer
  }, [cleanup, user?.id])

  const startCall = useCallback(async (targetUser: any, audioOnly: boolean) => {
    if (!user) return
    setIsAudioOnly(audioOnly)
    setRemoteUser(targetUser)
    setCallStatus("calling")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !audioOnly,
        audio: true
      })
      setLocalStream(stream)
      localStreamRef.current = stream

      const supabase = createClient()
      const channelId = [user.id, targetUser.id].sort().join("-")
      const channel = supabase.channel(`call-${channelId}`)
      
      channel
        .on("broadcast", { event: "call-signal" }, ({ payload }) => {
          if (payload.from === user.id) return
          
          if (payload.type === "answer") {
            if (peerRef.current) {
              peerRef.current.signal(payload.signal)
            }
          } else if (payload.type === "reject") {
            toast.error(payload.reason === "busy" ? "User is busy" : "Call rejected")
            cleanup()
          } else if (payload.type === "hangup") {
            cleanup()
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setupPeer(true, stream)
            
            // Send incoming call signal to target user's private signal channel
            const targetSignalChannel = supabase.channel(`user-signals-${targetUser.id}`)
            targetSignalChannel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    targetSignalChannel.send({
                        type: "broadcast",
                        event: "call-signal",
                        payload: { 
                          type: "incoming", 
                          from: user.id, 
                          fromUser: {
                              id: user.id,
                              username: user.username || "User",
                              full_name: user.full_name || "User",
                              profile_picture: user.profile_picture || ""
                          },
                          audioOnly 
                        }
                    })
                    setTimeout(() => targetSignalChannel.unsubscribe(), 1000)
                }
            })
          }
        })

      channelRef.current = channel
    } catch (err) {
      console.error("Failed to get media devices:", err)
      toast.error("Could not access camera/microphone")
      cleanup()
    }
  }, [user, cleanup, setupPeer])

  const answerCall = useCallback(async () => {
    if (!user || !remoteUser) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !isAudioOnly,
        audio: true
      })
      setLocalStream(stream)
      localStreamRef.current = stream

      setupPeer(false, stream)
      setCallStatus("active")
    } catch (err) {
      console.error("Failed to answer call:", err)
      toast.error("Could not access camera/microphone")
      rejectCall()
    }
  }, [user, remoteUser, isAudioOnly, setupPeer])

  const rejectCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: { type: "reject", from: user?.id }
      })
    }
    cleanup()
  }, [cleanup, user?.id])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [isMuted])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [isVideoOff])

  // Listen for incoming calls globally
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const signalChannel = supabase.channel(`user-signals-${user.id}`)
    
    signalChannel
      .on("broadcast", { event: "call-signal" }, async ({ payload }) => {
        if (payload.type === "incoming") {
          if (callStatus !== "idle") {
            const busyChannel = supabase.channel(`call-${[user.id, payload.from].sort().join("-")}`)
            busyChannel.subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    busyChannel.send({
                        type: "broadcast",
                        event: "call-signal",
                        payload: { type: "reject", from: user.id, reason: "busy" }
                    })
                    setTimeout(() => busyChannel.unsubscribe(), 1000)
                }
            })
            return
          }

          setRemoteUser(payload.fromUser)
          setIsAudioOnly(payload.audioOnly)
          setCallStatus("incoming")

          const channelId = [user.id, payload.from].sort().join("-")
          const channel = supabase.channel(`call-${channelId}`)
          
          channel
            .on("broadcast", { event: "call-signal" }, ({ payload: signalPayload }) => {
              if (signalPayload.from === user.id) return
              
              if (signalPayload.type === "offer") {
                if (peerRef.current) {
                  peerRef.current.signal(signalPayload.signal)
                } else {
                  pendingSignalRef.current = signalPayload.signal
                }
              } else if (signalPayload.type === "hangup") {
                cleanup()
              }
            })
            .subscribe()
          
          channelRef.current = channel
        }
      })
      .subscribe()

    return () => {
      signalChannel.unsubscribe()
    }
  }, [user, callStatus, cleanup])

  return (
    <CallContext.Provider value={{ 
        callStatus, 
        isAudioOnly, 
        remoteUser, 
        localStream, 
        remoteStream, 
        startCall, 
        answerCall, 
        rejectCall, 
        endCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  )
}

export const useCall = () => {
  const context = useContext(CallContext)
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider")
  }
  return context
}
