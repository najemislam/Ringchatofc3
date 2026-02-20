import { MessageCircle } from "lucide-react"

export function RingchatLogo({ size = 80 }: { size?: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 rounded-[28%] shadow-lg shadow-green-500/20"
      style={{ width: size, height: size }}
    >
      <MessageCircle 
        size={size * 0.6} 
        className="text-white fill-white" 
        strokeWidth={2.5}
      />
    </div>
  )
}

export function RingchatLogoSmall({ size = 32 }: { size?: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 rounded-[28%] shadow-sm"
      style={{ width: size, height: size }}
    >
      <MessageCircle 
        size={size * 0.6} 
        className="text-white fill-white" 
        strokeWidth={2.5}
      />
    </div>
  )
}
