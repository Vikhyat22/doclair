'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Tool } from '@/types'
import { CATEGORIES } from '@/constants/tools'

interface ToolSearchFilterProps {
  tools: Tool[]
  onFiltered: (filtered: Tool[]) => void
  onSearchChange?: (text: string) => void
  showResultCount?: boolean
  resetSignal?: number
}

const PLACEHOLDERS = [
  'Search 70+ tools...',
  'Try "compress"...',
  'Try "merge PDF"...',
  'Try "remove background"...',
  'Try "GST invoice"...',
  'Try "password protect"...',
]

export default function ToolSearchFilter({
  tools,
  onFiltered,
  onSearchChange,
  showResultCount = true,
  resetSignal = 0,
}: ToolSearchFilterProps) {
  const [searchText, setSearchText] = useState('')
  const [activeCategory, setActiveCategory] = useState('All Tools')

  // Reset internal state when parent signals a clear
  useEffect(() => {
    if (resetSignal === 0) return
    setSearchText('')
    setActiveCategory('All Tools')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Filter logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchText.trim().toLowerCase()
    const filtered = tools.filter(tool => {
      const matchesCategory =
        activeCategory === 'All Tools' || tool.category === activeCategory
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.desc.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
    onFiltered(filtered)
    onSearchChange?.(searchText.trim())
  }, [searchText, activeCategory, tools, onFiltered, onSearchChange])

  // ── Placeholder rotation ───────────────────────────────────────────────────
  useEffect(() => {
    if (searchText || isFocused) return
    const interval = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length)
        setPlaceholderVisible(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [searchText, isFocused])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchText('')
      inputRef.current?.blur()
    }
  }

  const clearSearch = useCallback(() => {
    setSearchText('')
    inputRef.current?.focus()
  }, [])

  const filteredCount = (() => {
    const q = searchText.trim().toLowerCase()
    return tools.filter(tool => {
      const matchesCategory =
        activeCategory === 'All Tools' || tool.category === activeCategory
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.desc.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    }).length
  })()

  const hasSearch = searchText.trim().length > 0

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* ── Search input ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'white',
        border: `1px solid ${isFocused ? 'var(--amber)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '14px',
        transition: 'border-color 0.2s',
        boxShadow: isFocused ? '0 0 0 3px rgba(232,130,12,0.08)' : 'none',
      }}>
        {/* Search icon */}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted, #9CA3AF)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--ink)',
            opacity: placeholderVisible || searchText ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* Kbd hint — shown when empty + not focused */}
        {!hasSearch && !isFocused && (
          <span style={{
            fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
            fontSize: '10px',
            color: 'var(--muted, #9CA3AF)',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            padding: '2px 6px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>/</span>
        )}

        {/* Clear button */}
        {hasSearch && (
          <button
            onClick={clearSearch}
            aria-label="Clear search"
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, fontSize: '16px',
              color: 'var(--muted, #9CA3AF)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#FFF0DC'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--muted, #9CA3AF)'
            }}
          >✕</button>
        )}
      </div>

      {/* ── Category pills ── */}
      <div className="category-pills" style={{ marginBottom: '14px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`cat-btn${activeCategory === cat ? ' cat-btn-active' : ''}`}
            style={{
              padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
              border: `1px solid ${activeCategory === cat ? 'var(--ink)' : 'rgba(26,22,18,0.15)'}`,
              background: activeCategory === cat ? 'var(--ink)' : 'transparent',
              color: activeCategory === cat ? 'white' : 'var(--ink)',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            }}
          >{cat}</button>
        ))}
      </div>

      {/* ── Result count / hint ── */}
      {showResultCount && hasSearch ? (
        <div style={{
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '11px', color: 'var(--amber)',
          letterSpacing: '0.06em',
        }}>
          {filteredCount} tool{filteredCount !== 1 ? 's' : ''} found
        </div>
      ) : !hasSearch ? (
        <div style={{
          fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
          fontSize: '10px', color: 'var(--muted, #9CA3AF)',
          opacity: 0.6, textAlign: 'center',
        }}>
          Press / to search · Filter by category above
        </div>
      ) : null}
    </div>
  )
}

/* ── Empty state component ── */
export function ToolEmptyState({
  searchText,
  onClear,
}: {
  searchText: string
  onClear: () => void
}) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '64px 24px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px' }}>🔍</div>
      <div style={{
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        fontSize: '16px', color: 'var(--ink)', fontWeight: 500,
      }}>
        No tools found for &ldquo;{searchText}&rdquo;
      </div>
      <button
        onClick={onClear}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
          fontSize: '14px', color: 'var(--amber)', textDecoration: 'underline',
          textUnderlineOffset: '3px', padding: 0,
        }}
      >
        Try a different search or browse all tools →
      </button>
    </div>
  )
}
