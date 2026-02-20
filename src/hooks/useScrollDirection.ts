import { useState, useEffect } from "react"

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null)
  const [prevOffset, setPrevOffset] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const currentOffset = window.pageYOffset
      
      // Ignore small scrolls
      if (Math.abs(currentOffset - prevOffset) < 10) {
        return
      }

      if (currentOffset > prevOffset && currentOffset > 50) {
        setScrollDirection("down")
        setVisible(false)
      } else {
        setScrollDirection("up")
        setVisible(true)
      }
      
      setPrevOffset(currentOffset)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [prevOffset])

  return { scrollDirection, visible }
}
