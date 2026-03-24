'use client'

import { useEffect } from 'react'

export default function ClarityScript({ clarityId }: { clarityId: string }) {
  useEffect(() => {
    // Inject Microsoft Clarity after hydration to avoid blocking render
    const w = window as typeof window & { clarity?: (...args: unknown[]) => void }
    if (w.clarity) return // already loaded
    w.clarity = function (...args: unknown[]) {
      ((w.clarity as unknown as { q: unknown[] }).q = (w.clarity as unknown as { q: unknown[] }).q || []).push(args)
    }
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.clarity.ms/tag/${clarityId}`
    document.head.appendChild(script)
  }, [clarityId])

  return null
}
