'use client'

import { useEffect } from 'react'

const PHRASES = [
  'reokiy 🖤 links',
  'your lewd dumb elf ♥',
  'join the server :3',
  'reokiy • vrchat',
  'check my links~',
  'uwu hi there ✨',
]

export default function TypewriterTitle() {
  useEffect(() => {
    let phraseIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeout: ReturnType<typeof setTimeout>

    const tick = () => {
      const phrase = PHRASES[phraseIndex]

      if (!isDeleting) {
        charIndex++
        document.title = phrase.slice(0, charIndex)

        if (charIndex === phrase.length) {
          isDeleting = true
          timeout = setTimeout(tick, 1800)
        } else {
          timeout = setTimeout(tick, 80)
        }
      } else {
        charIndex--
        document.title = phrase.slice(0, charIndex)

        if (charIndex === 0) {
          isDeleting = false
          phraseIndex = (phraseIndex + 1) % PHRASES.length
          timeout = setTimeout(tick, 400)
        } else {
          timeout = setTimeout(tick, 45)
        }
      }
    }

    timeout = setTimeout(tick, 600)
    return () => clearTimeout(timeout)
  }, [])

  return null
}