"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { toast } from "sonner"

interface CallUser {
  id: string
  full_name: string
  username: string
  profile_picture?: string
}

interface CallModalProps {
  callId: string
  callType: "audio" | "video"
  otherUser: CallUser
  currentUserId: string
  isCaller: boolean
  onClose: () => void
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

export default function CallModal({
  callId,
  callType,
  otherUser,
  currentUserId,
  isCaller,
  onClose,
}: CallModalProps) {
  const [status, setStatus] = useState<"ringing" | "connecting" | "connected" | "ended">(
    isCaller ? "ringing" : "ringing"
  )
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOff, setIsSpeakerOff] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
  }, [])

  const endCall = useCallback(
    async (updateDb = true) => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
      stopLocalStream()
      setStatus("ended")
      if (updateDb) {
        await supabase.from("calls").update({ status: "ended" }).eq("id", callId)
      }
      setTimeout(onClose, 800)
    },
    [callId, onClose, stopLocalStream, supabase]
  )

  const setupPeerConnection = useCallback(
    async (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      pc.onicecandidate = async (event) => {
        if (!event.candidate) return
        const { data: call } = await supabase.from("calls").select("caller_ice, receiver_ice").eq("id", callId).single()
        if (!call) return
        if (isCaller) {
          const updated = [...(call.caller_ice || []), event.candidate.toJSON()]
          await supabase.from("calls").update({ caller_ice: updated }).eq("id", callId)
        } else {
          const updated = [...(call.receiver_ice || []), event.candidate.toJSON()]
          await supabase.from("calls").update({ receiver_ice: updated }).eq("id", callId)
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("connected")
          durationIntervalRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)
        } else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          endCall(false)
        }
      }

      return pc
    },
    [callId, isCaller, endCall, supabase]
  )

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = await setupPeerConnection(stream)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await supabase
        .from("calls")
        .update({ offer: { type: offer.type, sdp: offer.sdp } })
        .eq("id", callId)
    } catch {
      toast.error("Could not access camera/microphone")
      endCall(true)
    }
  }, [callId, callType, setupPeerConnection, endCall, supabase])

  const acceptCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const { data: call } = await supabase.from("calls").select("offer").eq("id", callId).single()
      if (!call?.offer) return

      const pc = await setupPeerConnection(stream)
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await supabase
        .from("calls")
        .update({ answer: { type: answer.type, sdp: answer.sdp }, status: "accepted" })
        .eq("id", callId)

      setStatus("connecting")
    } catch {
      toast.error("Could not access camera/microphone")
      endCall(true)
    }
  }, [callId, callType, setupPeerConnection, endCall, supabase])

  const rejectCall = async () => {
    await supabase.from("calls").update({ status: "rejected" }).eq("id", callId)
    onClose()
  }

  // Subscribe to call updates
  useEffect(() => {
    if (isCaller) startCall()

    const channel = supabase
      .channel(`call-${callId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        async (payload) => {
          const call = payload.new as any

          if (call.status === "rejected") {
            toast.error("Call declined")
            endCall(false)
            return
          }

          if (call.status === "ended") {
            endCall(false)
            return
          }

          const pc = peerConnectionRef.current
          if (!pc) return

          // Caller: got answer
          if (isCaller && call.answer && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(call.answer))
            setStatus("connecting")
          }

          // Add ICE candidates
          const candidates = isCaller ? call.receiver_ice : call.caller_ice
          if (candidates?.length && pc.remoteDescription) {
            const existing = (pc as any)._addedCandidates || new Set()
            for (const c of candidates) {
              const key = JSON.stringify(c)
              if (!existing.has(key)) {
                existing.add(key)
                try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
              }
            }
            ;(pc as any)._addedCandidates = existing
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callId, isCaller, startCall, endCall, supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      peerConnectionRef.current?.close()
      stopLocalStream()
    }
  }, [stopLocalStream])

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = isMuted))
    setIsMuted(!isMuted)
  }

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !isSpeakerOff
    setIsSpeakerOff(!isSpeakerOff)
  }

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = isVideoOff))
    setIsVideoOff(!isVideoOff)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between py-12 px-6">
      {/* Video streams */}
      {callType === "video" && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-32 right-4 w-28 h-40 rounded-xl object-cover border-2 border-white z-10"
          />
        </>
      )}

      {/* Hidden audio element for audio calls */}
      {callType === "audio" && (
        <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      )}
      {callType === "audio" && (
        <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
      )}

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-8">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 bg-gray-700">
          {otherUser.profile_picture ? (
            <img src={otherUser.profile_picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-4xl font-bold">
              {otherUser.full_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">{otherUser.full_name}</h2>
          <p className="text-white/70 text-base mt-1">
            {status === "ringing" && (isCaller ? "Calling..." : `Incoming ${callType} call`)}
            {status === "connecting" && "Connecting..."}
            {status === "connected" && formatDuration(callDuration)}
            {status === "ended" && "Call ended"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full">
        {/* Incoming call — show accept/reject */}
        {!isCaller && status === "ringing" ? (
          <div className="flex items-center justify-center gap-16">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-white/70 text-sm">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Phone className="w-7 h-7 text-white" />
              </button>
              <span className="text-white/70 text-sm">Accept</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white text-black" : "bg-white/20 text-white"}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <span className="text-white/60 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
            </div>

            {callType === "video" && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white text-black" : "bg-white/20 text-white"}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <span className="text-white/60 text-xs">{isVideoOff ? "Show" : "Hide"}</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isSpeakerOff ? "bg-white text-black" : "bg-white/20 text-white"}`}
              >
                {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <span className="text-white/60 text-xs">Speaker</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => endCall(true)}
                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <span className="text-white/60 text-xs">End</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
