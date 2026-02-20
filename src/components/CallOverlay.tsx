"use client"

import React, { useEffect, useRef } from "react"
import { useCall } from "@/context/CallContext"
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function CallOverlay() {
  const { 
    callStatus, 
    isAudioOnly, 
    remoteUser, 
    localStream, 
    remoteStream, 
    answerCall, 
    rejectCall, 
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff
  } = useCall()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (callStatus === "idle") return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white">
      {/* Background/Remote Video */}
      {callStatus === "active" && !isAudioOnly ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-32 h-32 border-4 border-primary">
            <AvatarImage src={remoteUser?.profile_picture} />
            <AvatarFallback className="bg-muted text-4xl">
              {remoteUser?.full_name?.charAt(0) || <User className="w-16 h-16" />}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{remoteUser?.full_name || "Unknown User"}</h2>
          <p className="text-muted-foreground">
            {callStatus === "calling" ? "Calling..." : 
             callStatus === "incoming" ? "Incoming Call..." : 
             "Connected"}
          </p>
        </div>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {callStatus === "active" && !isAudioOnly && (
        <div className="absolute top-4 right-4 w-32 h-48 bg-muted rounded-lg overflow-hidden border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Call Controls */}
      <div className="absolute bottom-12 flex items-center gap-6">
        {callStatus === "incoming" ? (
          <>
            <Button
              onClick={rejectCall}
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <Button
              onClick={answerCall}
              variant="default"
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              variant="outline"
              size="icon"
              className={`rounded-full w-14 h-14 bg-white/10 border-white/20 hover:bg-white/20 ${isMuted ? 'text-red-500' : 'text-white'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              onClick={endCall}
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>

            {!isAudioOnly && (
              <Button
                onClick={toggleVideo}
                variant="outline"
                size="icon"
                className={`rounded-full w-14 h-14 bg-white/10 border-white/20 hover:bg-white/20 ${isVideoOff ? 'text-red-500' : 'text-white'}`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
