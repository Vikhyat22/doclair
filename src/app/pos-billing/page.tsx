'use client'

import { useState, useEffect, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'

// ---- Types ----------------------------------------------------------------

interface Product {
  id: string
  name: string
  price: number
  hsn: string
  gstRate: 0 | 5 | 12 | 18 | 28
  unit: string
}

interface CartItem {
  product: Product
  qty: number
  discount: number
}

interface Bill {
  id: string
  billNumber: string
  date: string
  customer: string
  items: CartItem[]
  total: number
  gstBreakup: Record<number, number>
}

interface ShopProfile {
  name: string
  address: string
  gstin: string
  phone: string
}

// ---- Constants ------------------------------------------------------------

const GST_RATES = [0, 5, 12, 18, 28] as const

const SAMPLE_PRODUCTS: Product[] = [
  { id: 'demo-1', name: 'Sample Product', price: 100, hsn: '8471', gstRate: 18, unit: 'Pcs' },
]

const LS_PRODUCTS = 'doclair-pos-products'
const LS_BILLS    = 'doclair-pos-bills'
const LS_SHOP     = 'doclair-pos-shop'

const FAQS = [
  {
    q: 'Is POS Billing on Doclair free to use?',
    a: 'Yes, completely free with no limits, no subscription, and no watermarks on receipts. Your data stays entirely on your device.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Once the page has loaded, the entire POS system works offline. Products, bills, and shop profile are all stored in your browser\'s localStorage.',
  },
  {
    q: 'Will my data be lost if I clear my browser?',
    a: 'Clearing browser data (localStorage) will erase your product catalog and bill history. We recommend exporting important bills as PDFs regularly.',
  },
  {
    q: 'Can I print the thermal receipt directly?',
    a: 'The receipt is generated as a PDF optimised for 80mm thermal printers (A6 width). Download and open it, then print using your browser\'s print dialog with "Fit to page" selected.',
  },
  {
    q: 'Is GST automatically calculated on receipts?',
    a: 'Yes. Each product in the catalog has a GST rate (0%, 5%, 12%, 18%, or 28%). The receipt shows a GST breakup by rate and the grand total inclusive of GST.',
  },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'POS Billing — Doclair',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pos-billing',
      description: 'Free point-of-sale billing for Indian shops. Product catalog, GST receipts, bill history. Works offline. No sign-up, data stays on device.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: [
        'Product catalog', 'Cart with qty & discount', 'GST calculation',
        'Thermal receipt PDF', 'Bill history', 'Offline-capable', 'No server upload',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',        item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools',       item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'POS Billing', item: 'https://doclair.in/pos-billing' },
  ],
}

// ---- Styles ---------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
  color: 'var(--ink)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--ink)',
  opacity: 0.65,
  marginBottom: '6px',
  display: 'block',
  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
  fontSize: '10px',
  color: 'var(--amber)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  fontWeight: 500,
  marginBottom: '16px',
}

// ---- PDF Receipt generator ------------------------------------------------

async function generateReceipt(bill: Bill, shop: ShopProfile): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('@cantoo/pdf-lib')

  const doc = await PDFDocument.create()
  // 80mm thermal ≈ 226pt wide
  const pageWidth = 226
  const pageHeight = 600
  const page = doc.addPage([pageWidth, pageHeight])

  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink   = rgb(0.10, 0.08, 0.07)
  const muted = rgb(0.48, 0.43, 0.38)
  const amber = rgb(0.91, 0.51, 0.05)

  let y = pageHeight - 16

  function drawLine(x1: number, x2: number) {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.4, color: muted })
    y -= 6
  }

  function drawText(text: string, options: { x?: number; size?: number; bold?: boolean; center?: boolean; color?: ReturnType<typeof rgb> }) {
    const { x = 10, size = 8, bold = false, center = false, color = ink } = options
    const font = bold ? fontB : fontR
    const tx = center ? (pageWidth - font.widthOfTextAtSize(text, size)) / 2 : x
    page.drawText(text, { x: tx, y, size, font, color })
    y -= size + 4
  }

  // Shop name
  drawText(shop.name || 'My Shop', { size: 12, bold: true, center: true })
  if (shop.address) drawText(shop.address, { size: 7, center: true, color: muted })
  if (shop.gstin)   drawText('GSTIN: ' + shop.gstin, { size: 7, center: true, color: muted })
  if (shop.phone)   drawText('Ph: ' + shop.phone, { size: 7, center: true, color: muted })
  y -= 4

  drawLine(10, pageWidth - 10)

  drawText(bill.billNumber, { size: 9, bold: true, center: true })
  drawText('Date: ' + bill.date, { size: 7, center: true, color: muted })
  if (bill.customer) drawText('Customer: ' + bill.customer, { size: 7, center: true, color: muted })
  y -= 4

  drawLine(10, pageWidth - 10)

  // Items header
  page.drawText('Item', { x: 10, y, size: 7, font: fontB, color: muted })
  page.drawText('Qty', { x: 120, y, size: 7, font: fontB, color: muted })
  page.drawText('Price', { x: 148, y, size: 7, font: fontB, color: muted })
  page.drawText('Total', { x: 185, y, size: 7, font: fontB, color: muted })
  y -= 12

  for (const ci of bill.items) {
    const lineTotal = ci.product.price * ci.qty * (1 - ci.discount / 100)
    // Truncate long names
    const name = ci.product.name.length > 16 ? ci.product.name.slice(0, 15) + '…' : ci.product.name
    page.drawText(name, { x: 10, y, size: 7, font: fontR, color: ink })
    page.drawText(String(ci.qty), { x: 120, y, size: 7, font: fontR, color: ink })
    page.drawText('Rs.' + ci.product.price.toFixed(2), { x: 148, y, size: 7, font: fontR, color: ink })
    page.drawText('Rs.' + lineTotal.toFixed(2), { x: 185, y, size: 7, font: fontR, color: ink })
    y -= 11
    if (ci.discount > 0) {
      page.drawText(`  Disc ${ci.discount}%`, { x: 10, y, size: 6, font: fontR, color: muted })
      y -= 10
    }
  }

  y -= 4
  drawLine(10, pageWidth - 10)

  // GST breakup
  const gstEntries = Object.entries(bill.gstBreakup).filter(([, v]) => v > 0)
  if (gstEntries.length > 0) {
    for (const [rate, amt] of gstEntries) {
      page.drawText(`GST @${rate}%`, { x: 10, y, size: 7, font: fontR, color: muted })
      const s = 'Rs.' + amt.toFixed(2)
      page.drawText(s, { x: pageWidth - 10 - fontR.widthOfTextAtSize(s, 7), y, size: 7, font: fontR, color: muted })
      y -= 11
    }
    y -= 4
    drawLine(10, pageWidth - 10)
  }

  // Grand total
  page.drawText('GRAND TOTAL', { x: 10, y, size: 10, font: fontB, color: ink })
  const gs = 'Rs.' + bill.total.toFixed(2)
  page.drawText(gs, { x: pageWidth - 10 - fontB.widthOfTextAtSize(gs, 10), y, size: 10, font: fontB, color: amber })
  y -= 16

  drawLine(10, pageWidth - 10)
  y -= 4

  drawText('Thank you for your purchase!', { center: true, size: 8, color: muted })
  drawText('Powered by Doclair — doclair.in', { center: true, size: 6, color: muted })

  return doc.save()
}

// ---- Helpers --------------------------------------------------------------

function newBillNumber() {
  return `BILL-${Date.now().toString().slice(-6)}`
}

function computeGSTBreakup(items: CartItem[]): Record<number, number> {
  const breakup: Record<number, number> = {}
  for (const ci of items) {
    const taxable = ci.product.price * ci.qty * (1 - ci.discount / 100)
    const gst = taxable * ci.product.gstRate / 100
    breakup[ci.product.gstRate] = (breakup[ci.product.gstRate] ?? 0) + gst
  }
  return breakup
}

function computeTotal(items: CartItem[]): number {
  return items.reduce((sum, ci) => {
    const taxable = ci.product.price * ci.qty * (1 - ci.discount / 100)
    return sum + taxable * (1 + ci.product.gstRate / 100)
  }, 0)
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ---- Component -----------------------------------------------------------

export default function POSBillingPage() {
  const [activeTab, setActiveTab] = useState<'bill' | 'products' | 'history'>('bill')

  // Shop profile
  const [shop, setShop] = useState<ShopProfile>({ name: '', address: '', gstin: '', phone: '' })
  const [shopOpen, setShopOpen] = useState(false)

  // Product catalog
  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({ name: '', price: 0, hsn: '', gstRate: 18, unit: 'Pcs' })

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState('')
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Bill history
  const [bills, setBills] = useState<Bill[]>([])
  const [generatingBill, setGeneratingBill] = useState(false)
  const [billError, setBillError] = useState('')
  const [reprintErrors, setReprintErrors] = useState<Record<string, string>>({})
  const [productNameError, setProductNameError] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PRODUCTS)
      setProducts(p ? JSON.parse(p) : SAMPLE_PRODUCTS)
    } catch { setProducts(SAMPLE_PRODUCTS) }

    try {
      const b = localStorage.getItem(LS_BILLS)
      if (b) setBills(JSON.parse(b))
    } catch { /* ignore */ }

    try {
      const s = localStorage.getItem(LS_SHOP)
      if (s) setShop(JSON.parse(s))
    } catch { /* ignore */ }
  }, [])

  // Persist products
  function saveProducts(updated: Product[]) {
    setProducts(updated)
    try { localStorage.setItem(LS_PRODUCTS, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  // Persist shop
  function saveShop(updated: ShopProfile) {
    setShop(updated)
    try { localStorage.setItem(LS_SHOP, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  // Persist bills
  function saveBills(updated: Bill[]) {
    setBills(updated)
    try { localStorage.setItem(LS_BILLS, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  // Cart helpers
  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) {
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { product, qty: 1, discount: 0 }]
    })
    setSearch('')
    setShowSuggestions(false)
  }

  function updateCartQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.product.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
  }

  function updateCartDiscount(id: string, discount: number) {
    setCart(prev => prev.map(c => c.product.id === id ? { ...c, discount: Math.min(100, Math.max(0, discount)) } : c))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.product.id !== id))
  }

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty * (1 - c.discount / 100), 0)
  const gstBreakup = computeGSTBreakup(cart)
  const totalGST = Object.values(gstBreakup).reduce((s, v) => s + v, 0)
  const grandTotal = computeTotal(cart)

  const suggestions = search.length > 0
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : []

  async function handleGenerateBill() {
    if (cart.length === 0) { setBillError('Cart is empty.'); return }
    setBillError('')
    setGeneratingBill(true)
    try {
      const bill: Bill = {
        id: crypto.randomUUID(),
        billNumber: newBillNumber(),
        date: new Date().toLocaleDateString('en-IN'),
        customer,
        items: cart,
        total: grandTotal,
        gstBreakup,
      }
      const bytes = await generateReceipt(bill, shop)
      triggerDownload(bytes, `${bill.billNumber}.pdf`)
      const updated = [bill, ...bills].slice(0, 100)
      saveBills(updated)
      setCart([])
      setCustomer('')
    } catch (err) {
      setBillError('Failed to generate bill: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGeneratingBill(false)
    }
  }

  async function handleReprint(bill: Bill) {
    setReprintErrors(prev => ({ ...prev, [bill.id]: '' }))
    try {
      const bytes = await generateReceipt(bill, shop)
      triggerDownload(bytes, `${bill.billNumber}.pdf`)
    } catch (err) {
      setReprintErrors(prev => ({ ...prev, [bill.id]: 'Reprint failed: ' + (err instanceof Error ? err.message : String(err)) }))
    }
  }

  function handleDeleteBill(id: string) {
    if (!confirm('Delete this bill?')) return
    saveBills(bills.filter(b => b.id !== id))
  }

  // Product form helpers
  function handleAddProduct() {
    if (!newProduct.name.trim()) { setProductNameError('Product name is required.'); return }
    setProductNameError('')
    if (editingProduct) {
      saveProducts(products.map(p => p.id === editingProduct.id ? { ...newProduct, id: editingProduct.id } : p))
      setEditingProduct(null)
    } else {
      saveProducts([...products, { ...newProduct, id: crypto.randomUUID() }])
    }
    setNewProduct({ name: '', price: 0, hsn: '', gstRate: 18, unit: 'Pcs' })
  }

  function handleEditProduct(p: Product) {
    setEditingProduct(p)
    setNewProduct({ name: p.name, price: p.price, hsn: p.hsn, gstRate: p.gstRate, unit: p.unit })
  }

  function handleDeleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    saveProducts(products.filter(p => p.id !== id))
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'GST Invoice', slug: 'gst-invoice', icon: '🧾', colorBg: '#FFF0DC', desc: 'Full tax invoice' },
      ]}
      relatedTools={[
        { name: 'Merge PDF',    slug: 'merge-pdf',    icon: '🔗', colorBg: '#EDE9FE' },
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="POS Billing" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Header */}
      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Data Stays On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF7ED', color: '#9A3412', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🇮🇳 India</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>📶 Works Offline</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>POS </span>
          <span style={{ color: 'var(--amber)' }}>Billing</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Point-of-sale billing for Indian shops. Manage products, generate GST thermal receipts, and track bill history — all offline, all private.
        </p>
      </div>

      {/* Shop Profile */}
      <div style={cardStyle}>
        <button
          onClick={() => setShopOpen(o => !o)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={sectionTitleStyle}>// Shop Profile {shop.name ? `— ${shop.name}` : ''}</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', transition: 'transform 0.25s', display: 'inline-block', transform: shopOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {shopOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {(['name', 'address', 'gstin', 'phone'] as (keyof ShopProfile)[]).map(field => (
              <div key={field}>
                <label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type="text"
                  value={shop[field]}
                  onChange={e => saveShop({ ...shop, [field]: e.target.value })}
                  placeholder={field === 'name' ? 'My Shop' : field === 'gstin' ? '27AABCU9603R1ZX' : ''}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', background: 'var(--cream)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
        {(['bill', 'products', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'bill' ? '🛒 New Bill' : tab === 'products' ? '📦 Products' : '📜 History'}
          </button>
        ))}
      </div>

      {/* TAB: New Bill */}
      {activeTab === 'bill' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>// Add Products to Cart</div>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search product name..."
                style={inputStyle}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: 'white', border: '1px solid var(--border)', borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: '4px', overflow: 'hidden',
                }}>
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={() => addToCart(p)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left',
                        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>GST {p.gstRate}% · {p.unit}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--amber)' }}>₹{p.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer */}
            <div style={{ marginTop: '16px' }}>
              <label style={labelStyle}>Customer Name (optional)</label>
              <input type="text" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Walk-in Customer" style={inputStyle} />
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>// Cart</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Product', 'Price', 'Qty', 'Disc %', 'Total', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(ci => {
                      const lineTotal = ci.product.price * ci.qty * (1 - ci.discount / 100) * (1 + ci.product.gstRate / 100)
                      return (
                        <tr key={ci.product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{ci.product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>GST {ci.product.gstRate}%</div>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', color: 'var(--muted)' }}>₹{ci.product.price.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button onClick={() => updateCartQty(ci.product.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', minWidth: '24px', textAlign: 'center' }}>{ci.qty}</span>
                              <button onClick={() => updateCartQty(ci.product.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input
                              type="number" value={ci.discount} min={0} max={100}
                              onChange={e => updateCartDiscount(ci.product.id, parseFloat(e.target.value) || 0)}
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '70px' }}
                            />
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>₹{lineTotal.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            <button onClick={() => removeFromCart(ci.product.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '240px', background: 'var(--cream)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--muted)' }}>
                    <span>Subtotal</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {Object.entries(gstBreakup).filter(([,v]) => v > 0).map(([rate, amt]) => (
                    <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: 'var(--muted)' }}>
                      <span>GST @{rate}%</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{amt.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Total</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: 'var(--amber)' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
                    incl. GST ₹{totalGST.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateBill}
                disabled={generatingBill}
                style={{
                  marginTop: '16px', width: '100%', background: generatingBill ? 'rgba(26,22,18,0.5)' : 'var(--ink)',
                  color: 'white', padding: '14px 24px', borderRadius: '100px', border: 'none',
                  cursor: generatingBill ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => { if (!generatingBill) e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {generatingBill ? '⏳ Generating...' : '🖨 Generate Bill PDF'}
              </button>
              {billError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{billError}</p>}
            </div>
          )}

          {cart.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Cart is empty</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Search for a product above to add it to the cart.</div>
              {billError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '12px' }}>{billError}</p>}
            </div>
          )}
        </div>
      )}

      {/* TAB: Products */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add/Edit form */}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>// {editingProduct ? 'Edit Product' : 'Add Product'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input type="text" value={newProduct.name} onChange={e => { setNewProduct(p => ({ ...p, name: e.target.value })); if (productNameError) setProductNameError('') }} placeholder="Product name" style={{ ...inputStyle, borderColor: productNameError ? '#DC2626' : undefined }} />
                {productNameError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{productNameError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Price (₹)</label>
                <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} min={0} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>HSN Code</label>
                <input type="text" value={newProduct.hsn} onChange={e => setNewProduct(p => ({ ...p, hsn: e.target.value }))} placeholder="8471" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>GST Rate</label>
                <select value={newProduct.gstRate} onChange={e => setNewProduct(p => ({ ...p, gstRate: parseInt(e.target.value) as 0|5|12|18|28 }))} style={inputStyle}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input type="text" value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} placeholder="Pcs" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleAddProduct}
                style={{ padding: '10px 24px', borderRadius: '100px', border: 'none', background: 'var(--ink)', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '14px' }}
              >{editingProduct ? '✓ Save Changes' : '+ Add Product'}</button>
              {editingProduct && (
                <button
                  onClick={() => { setEditingProduct(null); setNewProduct({ name: '', price: 0, hsn: '', gstRate: 18, unit: 'Pcs' }) }}
                  style={{ padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: 'var(--muted)' }}
                >Cancel</button>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {products.map(p => (
              <div
                key={p.id}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => handleEditProduct(p)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = '#FFFBEB' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white' }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '16px', color: 'var(--amber)', fontWeight: 700, marginBottom: '4px' }}>₹{p.price.toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>HSN: {p.hsn || '—'} · GST {p.gstRate}% · {p.unit}</div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteProduct(p.id) }}
                  style={{ marginTop: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '11px' }}
                >Delete</button>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' }}>
                No products yet. Add your first product above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Bill History */}
      {activeTab === 'history' && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>// Bill History ({bills.length} bills)</div>
          {bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' }}>No bills yet. Generate your first bill from the New Bill tab.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bills.map(bill => (
                <div
                  key={bill.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'white', gap: '12px', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{bill.billNumber}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {bill.date}{bill.customer ? ` · ${bill.customer}` : ''} · {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--amber)', whiteSpace: 'nowrap' }}>₹{bill.total.toFixed(2)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReprint(bill)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
                      >Reprint</button>
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#FEE2E2', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#DC2626' }}
                      >Delete</button>
                    </div>
                    {reprintErrors[bill.id] && <p style={{ color: '#DC2626', fontSize: '12px', margin: 0 }}>{reprintErrors[bill.id]}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEO */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Create a POS Bill — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Generate a clean, printable point-of-sale bill or receipt PDF in seconds. Doclair&apos;s POS Billing tool creates professional thermal-style receipts for retail, food service, and service businesses.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Enter your business name and contact details.</strong> Set up your shop profile once — it&apos;s saved automatically for future bills.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Add items with name, quantity, and price.</strong> Search your product catalog or add items directly from the cart tab.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Set tax rate and discount if applicable.</strong> GST is calculated automatically per item based on the assigned GST rate.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Generate Bill — preview and download as PDF.</strong> The bill is saved to history for reprinting later.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Can I add a logo to the bill?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Yes. Upload your business logo and it will appear at the top of the bill. The layout is optimised for A4 printing and standard thermal printer paper widths.</p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>POS Billing on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Create bills on your phone and share directly via WhatsApp or print to a nearby Bluetooth thermal printer.</p>
      </div>

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
