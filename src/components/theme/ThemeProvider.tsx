'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('doclair-theme') as Theme | null
    const initial: Theme = saved ?? 'system'
    setThemeState(initial)
    applyTheme(initial)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const current = localStorage.getItem('doclair-theme')
      if (!current || current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  function applyTheme(t: Theme) {
    const systemDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    const resolved: ResolvedTheme =
      t === 'system' ? (systemDark ? 'dark' : 'light') : t
    document.documentElement.setAttribute('data-theme', resolved)
    setResolvedTheme(resolved)
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    if (t === 'system') {
      localStorage.removeItem('doclair-theme')
    } else {
      localStorage.setItem('doclair-theme', t)
    }
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
